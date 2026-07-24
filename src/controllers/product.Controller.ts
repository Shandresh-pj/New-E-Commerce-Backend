import {
  Request,
  Response,
  NextFunction,
} from "express";
import { plainToInstance } from "class-transformer";
import { validate as classValidate } from "class-validator";
import jwt from "jsonwebtoken";

import {
  Controller,
  Post,
  Get,
  Delete,
  Middleware,
  Swagger,
} from "../decorators";

import dataSource from "../config/database";
import { uploadAny } from "../utils/upload";
import { Product } from "../entities/products";
import { ProductApproval, ApprovalStatus, ApprovalActionType } from "../entities/productApproval";
import { ProductVariant } from "../entities/productVariant";
import {
  ProductAttribute,
  ProductAttributeValue,
  ProductAttributeValueProduct,
} from "../entities/productAttribute";
import { ApiError } from "../exceptions/ApiError";
import { applyPagination, paginationResponse } from "../utils/controllerFunctions";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductVariantDto,
  ProductAttributeValueLinkDto,
  ScanProductDto,
  ProductApprovalStatus,
} from "../dto";
import { Put } from "../decorators/put";
import { io } from "../socket/socket";
import { Notification } from "../entities/notification";
import { UserType } from "../utils/Role-Access";
import { GlobalNotificationService } from "../services/global-notification.service";

const PRODUCT_RELATIONS = {
  creator: true,
  couponProducts: true,
  variants: {
    ProductAttribute: true,
    ProductAttributeValue: true,
  },
  attributeValueLinks: {
    ProductAttributeValue: {
      ProductAttribute: true,
    },
  },
};

/**
 * Coerce string values (multipart/form-data fields arrive as strings)
 * to numbers for the given keys, in place on a shallow copy.
 */
const coerceNumbers = (
  data: Record<string, any>,
  keys: string[]
): Record<string, any> => {
  const copy = { ...data };
  keys.forEach((key) => {
    if (copy[key] !== undefined && copy[key] !== null && copy[key] !== "") {
      copy[key] = Number(copy[key]);
    }
  });
  return copy;
};

/**
 * Treat blank optional string fields (common from HTML forms) as
 * "not provided" instead of failing format validators like @Matches.
 */
const OPTIONAL_STRING_FIELDS = ["description", "barcode", "category", "manufacture_date", "expiry_date"];

const normalizeEmptyStrings = (
  data: Record<string, any>
): Record<string, any> => {
  const copy = { ...data };
  OPTIONAL_STRING_FIELDS.forEach((key) => {
    if (copy[key] === "") {
      copy[key] = undefined;
    }
  });
  return copy;
};

/**
 * Parse a repeatable-rows field (`variants`, `attribute_values`), which may
 * arrive as a real array (JSON request body) or as a JSON string
 * (multipart/form-data field).
 */
const parseJsonArrayField = (raw: any, fieldName: string): any[] => {
  if (raw === undefined || raw === null || raw === "") return [];

  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new ApiError(422, `${fieldName} must be a JSON array`);
      }
      return parsed;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(422, `Invalid JSON in ${fieldName} field`);
    }
  }

  throw new ApiError(422, `${fieldName} must be an array`);
};

const parseVariantsInput = (raw: any): any[] =>
  parseJsonArrayField(raw, "variants");

const parseAttributeValuesInput = (raw: any): any[] =>
  parseJsonArrayField(raw, "attribute_values");

/**
 * New variant rows from the UI carry a blank Id/CompanyId (e.g. "")
 * rather than omitting the key entirely — treat blank as "not provided"
 * so @IsOptional() actually skips it instead of failing @IsNumber().
 */
const normalizeVariantIds = (variants: any[]): any[] =>
  variants.map((v) => {
    const copy = { ...v };
    if (copy.Id === "" || copy.Id === null) copy.Id = undefined;
    if (copy.CompanyId === "" || copy.CompanyId === null) copy.CompanyId = undefined;
    return copy;
  });

/**
 * Validate a plain object against a DTO class, returning a flat
 * { field: messages[] } map (mirrors middleware/validate.ts).
 */
const validateAgainstDto = async (
  dtoClass: new () => object,
  plain: Record<string, any>
): Promise<Record<string, string[]>> => {
  const dto = plainToInstance(dtoClass, plain);

  const errors = await classValidate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  const result: Record<string, string[]> = {};

  errors.forEach((error) => {
    if (error.constraints) {
      result[error.property] = Object.values(error.constraints);
    }
  });

  return result;
};

/**
 * Validate each incoming variant payload's shape (required fields,
 * numeric ranges). Returns a map of "variants[i].field" -> messages.
 */
const validateVariantPayloads = async (
  variants: any[]
): Promise<Record<string, string[]>> => {
  const allErrors: Record<string, string[]> = {};

  for (let i = 0; i < variants.length; i++) {
    const coerced = coerceNumbers(variants[i], [
      "Id",
      "CompanyId",
      "Price",
      "Stock",
      "ProductAttributeId",
      "ProductAttributeValueId",
    ]);

    const errors = await validateAgainstDto(ProductVariantDto, coerced);

    Object.entries(errors).forEach(([field, messages]) => {
      allErrors[`variants[${i}].${field}`] = messages;
    });
  }

  return allErrors;
};

/**
 * Validate each incoming attribute_values payload's shape (a product
 * attribute / value pair, used to tag a single-type product). Returns a
 * map of "attribute_values[i].field" -> messages.
 */
const validateAttributeValuePayloads = async (
  items: any[]
): Promise<Record<string, string[]>> => {
  const allErrors: Record<string, string[]> = {};

  for (let i = 0; i < items.length; i++) {
    const coerced = coerceNumbers(items[i], [
      "ProductAttributeId",
      "ProductAttributeValueId",
    ]);

    const errors = await validateAgainstDto(ProductAttributeValueLinkDto, coerced);

    Object.entries(errors).forEach(([field, messages]) => {
      allErrors[`attribute_values[${i}].${field}`] = messages;
    });
  }

  return allErrors;
};

/**
 * Confirm every referenced ProductAttributeId / ProductAttributeValueId
 * pair actually exists and belongs together. Shared by `variants` and
 * `attribute_values`, which both carry that same pair shape.
 */
const validateAttributeReferencePairs = async (
  manager: any,
  items: any[],
  label: string
): Promise<Record<string, string[]>> => {
  const errors: Record<string, string[]> = {};

  const attributeRepo = manager.getRepository(ProductAttribute);
  const valueRepo = manager.getRepository(ProductAttributeValue);

  for (let i = 0; i < items.length; i++) {
    const item = coerceNumbers(items[i], [
      "ProductAttributeId",
      "ProductAttributeValueId",
    ]);

    const attribute = await attributeRepo.findOne({
      where: { Id: item.ProductAttributeId },
    });

    if (!attribute) {
      errors[`${label}[${i}].ProductAttributeId`] = [
        "ProductAttribute not found",
      ];
      continue;
    }

    const value = await valueRepo.findOne({
      where: {
        Id: item.ProductAttributeValueId,
        ProductAttributeId: item.ProductAttributeId,
      },
    });

    if (!value) {
      errors[`${label}[${i}].ProductAttributeValueId`] = [
        "ProductAttributeValue not found for the given ProductAttributeId",
      ];
    }
  }

  return errors;
};

const checkBarcodeUniqueness = async (
  manager: any,
  barcode: string | undefined | null,
  excludeProductId?: number,
  excludeVariantId?: number
): Promise<boolean> => {
  if (!barcode || !String(barcode).trim()) return true;
  const bc = String(barcode).trim();

  const productRepo = manager.getRepository(Product);
  const qbProd = productRepo.createQueryBuilder("p").where("p.barcode = :bc", { bc });
  if (excludeProductId) {
    qbProd.andWhere("p.id != :id", { id: excludeProductId });
  }
  const prodExists = await qbProd.getOne();
  if (prodExists) return false;

  const variantRepo = manager.getRepository(ProductVariant);
  const qbVar = variantRepo.createQueryBuilder("v").where("v.Barcode = :bc", { bc });
  if (excludeVariantId) {
    qbVar.andWhere("v.Id != :id", { id: excludeVariantId });
  }
  const varExists = await qbVar.getOne();
  if (varExists) return false;

  return true;
};

const validateVariantReferences = async (
  manager: any,
  variants: any[],
  productId?: number
): Promise<Record<string, string[]>> => {
  const errors = await validateAttributeReferencePairs(manager, variants, "variants");
  const seenPairs = new Set<string>();
  const seenBarcodes = new Set<string>();

  for (let i = 0; i < variants.length; i++) {
    const v = coerceNumbers(variants[i], ["ProductAttributeId", "ProductAttributeValueId", "Id"]);
    const pairKey = `${v.ProductAttributeId}_${v.ProductAttributeValueId}`;
    if (seenPairs.has(pairKey)) {
      errors[`variants[${i}]`] = (errors[`variants[${i}]`] || []).concat([
        "Duplicate attribute/value combination in variants list",
      ]);
    }
    seenPairs.add(pairKey);

    if (v.Barcode && String(v.Barcode).trim()) {
      const bc = String(v.Barcode).trim();
      if (seenBarcodes.has(bc)) {
        errors[`variants[${i}].Barcode`] = (errors[`variants[${i}].Barcode`] || []).concat([
          `Duplicate barcode '${bc}' inside request body`,
        ]);
      } else {
        seenBarcodes.add(bc);
        const isUnique = await checkBarcodeUniqueness(manager, bc, productId, v.Id);
        if (!isUnique) {
          errors[`variants[${i}].Barcode`] = (errors[`variants[${i}].Barcode`] || []).concat([
            `Barcode '${bc}' is already used by another product or variant`,
          ]);
        }
      }
    }
  }

  return errors;
};

const validateAttributeValueReferences = (manager: any, items: any[]) =>
  validateAttributeReferencePairs(manager, items, "attribute_values");

const extractUploadedFiles = (req: Request) => {
  const files = req as any;

  const image = files.files?.image?.[0]
    ? `/uploads/images/${files.files.image[0].filename}`
    : undefined;

  const video = files.files?.video?.[0]
    ? `/uploads/videos/${files.files.video[0].filename}`
    : undefined;

  const images = files.files?.images?.length
    ? files.files.images.map((f: any) => `/uploads/images/${f.filename}`)
    : undefined;

  return { image, video, images };
};


const HIDDEN_RESPONSE_FIELDS = ["stock", "qr_code"];


const buildSimpleAttributeList = (
  links: any[] | undefined,
  productId?: number
): any[] =>
  (links || []).map((link) => ({
    Id: link.Id,
    ProductId: productId,
    ProductAttributeId: link.ProductAttributeValue?.ProductAttributeId,
    ProductAttributeValueId: link.ProductAttributeValueId,
    AttributeName: link.ProductAttributeValue?.ProductAttribute?.Name || "",
    AttributeValue: link.ProductAttributeValue?.Name || "",
  }));


const sanitizeProduct = (product: any): any => {
  if (!product) return product;
  const { attributeValueLinks, ...rest } = product;
  HIDDEN_RESPONSE_FIELDS.forEach((key) => delete rest[key]);

  if (rest.product_type === "single") {
    rest.Attributes = buildSimpleAttributeList(attributeValueLinks, product.id);
    delete rest.variants;
  } else if (rest.product_type === "variant") {
    rest.Attributes = buildSimpleAttributeList(attributeValueLinks, product.id);
  }

  return rest;
};

const sanitizeProducts = (products: any[]): any[] =>
  products.map((p) => sanitizeProduct(p));

const parseExistingImages = (raw: any): string[] => {
  if (Array.isArray(raw)) return raw.filter((v) => typeof v === "string");
  if (typeof raw === "string") {
    if (raw === "") return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((v) => typeof v === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

@Controller("/products")
export class ProductController {

  // ================= CREATE =================
  @Post("/create")
  @Middleware([
    uploadAny.upload.fields([
      { name: "image", maxCount: 1 },
      { name: "images", maxCount: 10 },
      { name: "video", maxCount: 1 },
    ]),
    uploadAny.compressor,
  ])
  @Swagger("Create Product", "Create product with images, video and variants")
  async create(req: Request, res: Response, next: NextFunction) {

    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {

      const variantsInput = normalizeVariantIds(parseVariantsInput(req.body.variants));
      const attributeValuesInput = parseAttributeValuesInput(req.body.attribute_values);

      const body = normalizeEmptyStrings(
        coerceNumbers(req.body, [
          "price",
          "stock",
          "stock_in_hand",
          "registration_id",
          "low_stock_threshold",
          "critical_stock_threshold",
        ])
      );

      const dtoErrors = await validateAgainstDto(CreateProductDto, {
        ...body,
        variants: undefined,
        attribute_values: undefined,
      });

      const variantShapeErrors = await validateVariantPayloads(variantsInput);
      const attributeValueShapeErrors = await validateAttributeValuePayloads(
        attributeValuesInput
      );

      const combinedErrors = {
        ...dtoErrors,
        ...variantShapeErrors,
        ...attributeValueShapeErrors,
      };

      if (Object.keys(combinedErrors).length > 0) {
        throw new ApiError(422, "Validation Failed", combinedErrors);
      }

      if (variantsInput.length > 0) {
        const refErrors = await validateVariantReferences(
          qr.manager,
          variantsInput
        );

        if (Object.keys(refErrors).length > 0) {
          throw new ApiError(400, "Invalid variant references", refErrors);
        }
      }

      if (attributeValuesInput.length > 0) {
        const refErrors = await validateAttributeValueReferences(
          qr.manager,
          attributeValuesInput
        );

        if (Object.keys(refErrors).length > 0) {
          throw new ApiError(400, "Invalid attribute value references", refErrors);
        }
      }
      const repo = qr.manager.getRepository(Product);

      const {
        name,
        description,
        price,
        barcode,
        stock,
        category,
        registration_id,
        product_type,
        stock_in_hand,
        status,
        low_stock_threshold,
        critical_stock_threshold,
        manufacture_date,
        expiry_date,
      } = body;

      if (barcode) {
        const bcUnique = await checkBarcodeUniqueness(qr.manager, barcode);
        if (!bcUnique) {
          throw new ApiError(400, `Barcode '${barcode}' is already in use by another product or variant`);
        }
      }

      const { image, video, images } = extractUploadedFiles(req);

      const user = (req as any).user;
      const isAdmin = user?.isSuperAdmin || user?.userType === UserType.SUPER_ADMIN || user?.userType === UserType.ADMIN;

      if (!isAdmin) {
        // Create a pending ProductApproval request instead of writing to products table
        const approvalRepo = qr.manager.getRepository(ProductApproval);

        const newValues = {
          name,
          description,
          price,
          stock,
          barcode,
          category,
          registration_id: registration_id || user.userId,
          product_type,
          stock_in_hand,
          status: status || "active",
          low_stock_threshold: low_stock_threshold !== undefined ? Number(low_stock_threshold) : 5,
          critical_stock_threshold: critical_stock_threshold !== undefined ? Number(critical_stock_threshold) : 2,
          image: image ?? images?.[0],
          images: images ?? [],
          video,
          variants: variantsInput,
          attribute_values: attributeValuesInput
        };

        const audit = {
          action: "CREATE",
          user: user.email || user.username || `User ${user.userId}`,
          timestamp: new Date(),
          ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
          device: req.headers["user-agent"] as string,
          comment: "Initial creation submission",
        };

        const approvalRequest = approvalRepo.create({
          branch_id: user.branchId || null,
          company_id: user.companyId || null,
          requested_by: user.email || user.username || `User ${user.userId}`,
          requested_by_id: user.userId,
          requested_date: new Date(),
          status: ApprovalStatus.PENDING,
          action_type: ApprovalActionType.CREATE,
          new_values: newValues,
          audit_history: [audit]
        });

        await approvalRepo.save(approvalRequest);
        await qr.commitTransaction();

        // Emit realtime notifications
        try {
          const notificationRepo = dataSource.getRepository(Notification);
          const notification = notificationRepo.create({
            message: `New product "${name}" requires approval.`,
            type: "APPROVAL_REQUEST",
          });
          await notificationRepo.save(notification);
          io.emit("new-notification", notification);
        } catch (notifErr) {
          console.error("Failed to create notification on product create:", notifErr);
        }

        io.emit("approval-created", approvalRequest);

        return res.status(201).json({
          success: true,
          message: "Product creation request submitted for approval",
          data: approvalRequest,
        });
      }

      // If Admin, proceed with direct creation
      const product = repo.create({
        name,
        description,
        price,
        stock,
        barcode,
        category,
        registration_id: registration_id || user.userId,
        product_type,
        stock_in_hand,
        status: status || "active",
        approval_status: ProductApprovalStatus.PUBLISHED,
        low_stock_threshold: low_stock_threshold !== undefined ? Number(low_stock_threshold) : 5,
        critical_stock_threshold: critical_stock_threshold !== undefined ? Number(critical_stock_threshold) : 2,
        manufacture_date: manufacture_date || null,
        expiry_date: expiry_date || null,
        image: image ?? images?.[0],
        images: images ?? [],
        video,
      });

      await repo.save(product);

      let savedVariants: ProductVariant[] = [];

      if (variantsInput.length > 0) {
        const variantRepo = qr.manager.getRepository(ProductVariant);

        const variantEntities = variantsInput.map((v) => {
          const coerced = coerceNumbers(v, [
            "CompanyId",
            "Price",
            "Stock",
            "ProductAttributeId",
            "ProductAttributeValueId",
          ]);

          return variantRepo.create({
            CompanyId: coerced.CompanyId ?? 0,
            ProductId: product.id,
            Barcode: coerced.Barcode,
            Price: coerced.Price,
            Stock: coerced.Stock,
            ProductAttributeId: coerced.ProductAttributeId,
            ProductAttributeValueId: coerced.ProductAttributeValueId,
          });
        });

        savedVariants = await variantRepo.save(variantEntities);
      }

      let savedAttributeValues: any[] = [];

      if (attributeValuesInput.length > 0) {
        const linkRepo = qr.manager.getRepository(ProductAttributeValueProduct);

        const linkEntities = attributeValuesInput.map((item) => {
          const coerced = coerceNumbers(item, ["ProductAttributeValueId"]);
          return linkRepo.create({
            ProductId: product.id,
            ProductAttributeValueId: coerced.ProductAttributeValueId,
          });
        });

        const savedLinks = await linkRepo.save(linkEntities);

        savedAttributeValues = savedLinks.map((link, i) => ({
          Id: link.Id,
          ProductAttributeId: coerceNumbers(attributeValuesInput[i], [
            "ProductAttributeId",
          ]).ProductAttributeId,
          ProductAttributeValueId: link.ProductAttributeValueId,
        }));
      }

      await qr.commitTransaction();

      const createdProductData = {
        ...sanitizeProduct(product),
        variants: savedVariants,
        attribute_values: savedAttributeValues,
      };

      // Emit realtime socket event
      io.emit("product-created", createdProductData);

      await GlobalNotificationService.sendNotification(
        `Product "${product.name}" was added successfully.`,
        "PRODUCT_ADDED",
        { product_id: product.id }
      );

      return res.status(201).json({
        success: true,
        message: "Product created",
        data: createdProductData,
      });

    } catch (err) {
      await qr.rollbackTransaction();
      next(err);
    } finally {
      await qr.release();
    }
  }

  // ================= SCAN BARCODE / QR =================
  @Post("/scan")
  @Middleware([])
  @Swagger("Scan Product", "Scan barcode or QR to verify product")
  async scan(req: Request, res: Response, next: NextFunction) {

    try {

      const dto = plainToInstance(ScanProductDto, req.body);
      const errors = await classValidate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const validationErrors: Record<string, string[]> = {};
        errors.forEach((error) => {
          if (error.constraints) {
            validationErrors[error.property] = Object.values(error.constraints);
          }
        });
        throw new ApiError(422, "Validation Failed", validationErrors);
      }

      const repo = dataSource.getRepository(Product);

      const { code } = req.body;

      const product = await repo
        .createQueryBuilder("product")
        .where("product.barcode = :code", { code })
        .getOne();

      if (!product) {
        return res.status(404).json({
          success: false,
          verified: false,
          message: "Invalid barcode",
        });
      }

      let showAll = false;
      const auth = req.headers.authorization;
      if (auth && auth.startsWith("Bearer ")) {
        try {
          const token = auth.split(" ")[1];
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
          const userType = decoded.userType;
          if (
            decoded.isSuperAdmin === true ||
            userType === UserType.SUPER_ADMIN ||
            userType === UserType.ADMIN ||
            userType === UserType.BRANCH_MANAGER ||
            userType === UserType.SHOPKEEPER ||
            userType === UserType.BRANCH ||
            userType === UserType.EMPLOYEE
          ) {
            showAll = true;
          }
        } catch (e) {}
      }

      if (!showAll && product.status !== "active") {
        return res.status(404).json({
          success: false,
          verified: false,
          message: "Product not found or inactive",
        });
      }

      return res.json({
        success: true,
        verified: true,
        message: "Product verified successfully",
        data: product,
      });

    } catch (err) {
      next(err);
    }
  }

  // ================= GET ALL =================
  @Get("/")
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const repo = dataSource.getRepository(Product);

      const qb = repo
        .createQueryBuilder("product")
        .leftJoinAndSelect("product.creator", "creator")
        .leftJoinAndSelect("product.variants", "variants")
        .leftJoinAndSelect("variants.ProductAttribute", "variantAttr")
        .leftJoinAndSelect("variants.ProductAttributeValue", "variantAttrVal")
        .leftJoinAndSelect("product.attributeValueLinks", "attributeValueLinks")
        .leftJoinAndSelect("attributeValueLinks.ProductAttributeValue", "linkValue")
        .leftJoinAndSelect("linkValue.ProductAttribute", "linkValueAttr")
        .orderBy("product.id", "DESC");

      let showAll = false;
      const auth = req.headers.authorization;
      if (auth && auth.startsWith("Bearer ")) {
        try {
          const token = auth.split(" ")[1];
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
          const userType = decoded.userType;
          if (
            decoded.isSuperAdmin === true ||
            userType === UserType.SUPER_ADMIN ||
            userType === UserType.ADMIN ||
            userType === UserType.BRANCH_MANAGER ||
            userType === UserType.SHOPKEEPER ||
            userType === UserType.BRANCH ||
            userType === UserType.EMPLOYEE
          ) {
            showAll = true;
          }
        } catch (e) {}
      }

      if (!showAll) {
        qb.andWhere("product.status = :status", {
          status: "active",
        });
      }

      if (req.query.is_deleted === "true") {
        qb.andWhere("product.is_deleted = :is_deleted", { is_deleted: true });
      } else if (req.query.is_deleted !== "all") {
        qb.andWhere("product.is_deleted = :is_deleted", { is_deleted: false });
      }

      if (req.query.status) {
        const statusVal = req.query.status as string;
        if (Object.values(ProductApprovalStatus).includes(statusVal as any)) {
          qb.andWhere("product.approval_status = :approval_status", { approval_status: statusVal });
        } else {
          qb.andWhere("product.status = :status", { status: statusVal });
        }
      }

      if (req.query.product_type) {
        qb.andWhere("product.product_type = :product_type", {
          product_type: req.query.product_type,
        });
      }

      if (req.query.category) {
        qb.andWhere("product.category = :category", {
          category: req.query.category,
        });
      }

      if (req.query.search) {
        const searchStr = `%${String(req.query.search).trim()}%`;
        qb.andWhere(
          "(LOWER(product.name) LIKE LOWER(:search) OR LOWER(product.barcode) LIKE LOWER(:search))",
          { search: searchStr }
        );
      }

      const total = await qb.getCount();

      applyPagination(qb, page, limit);

      const data = await qb.getMany();

      return res.json({
        success: true,
        message: "Products fetched successfully",
        ...paginationResponse(sanitizeProducts(data), total, page, limit),
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= GET BY ID =================
  @Get("/:id")
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const repo = dataSource.getRepository(Product);

      const data = await repo.findOne({
        where: { id: Number(req.params.id) },
        relations: PRODUCT_RELATIONS,
      });

      if (!data) {
        throw new ApiError(404, "Product not found");
      }

      let showAll = false;
      const auth = req.headers.authorization;
      if (auth && auth.startsWith("Bearer ")) {
        try {
          const token = auth.split(" ")[1];
          const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
          const userType = decoded.userType;
          if (
            decoded.isSuperAdmin === true ||
            userType === UserType.SUPER_ADMIN ||
            userType === UserType.ADMIN ||
            userType === UserType.BRANCH_MANAGER ||
            userType === UserType.SHOPKEEPER ||
            userType === UserType.BRANCH ||
            userType === UserType.EMPLOYEE
          ) {
            showAll = true;
          }
        } catch (e) {}
      }

      if (!showAll && data.status !== "active") {
        throw new ApiError(404, "Product not found");
      }

      return res.json({
        success: true,
        data: sanitizeProduct(data),
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= UPDATE =================
  @Put("/:id")
  @Middleware([
    uploadAny.upload.fields([
      { name: "image", maxCount: 1 },
      { name: "images", maxCount: 10 },
      { name: "video", maxCount: 1 },
    ]),
    uploadAny.compressor,
  ])
  async update(req: Request, res: Response, next: NextFunction) {

    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const productId = Number(req.params.id);

      const repo = qr.manager.getRepository(Product);

      const product = await repo.findOneBy({ id: productId });

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      const hasVariantsField = req.body.variants !== undefined;
      const variantsInput = hasVariantsField
        ? normalizeVariantIds(parseVariantsInput(req.body.variants))
        : [];

      const hasAttributeValuesField = req.body.attribute_values !== undefined;
      const attributeValuesInput = hasAttributeValuesField
        ? parseAttributeValuesInput(req.body.attribute_values)
        : [];

      const body = normalizeEmptyStrings(
        coerceNumbers(req.body, [
          "price",
          "stock",
          "stock_in_hand",
          "registration_id",
          "low_stock_threshold",
          "critical_stock_threshold",
        ])
      );

      const dtoErrors = await validateAgainstDto(UpdateProductDto, {
        ...body,
        variants: undefined,
        attribute_values: undefined,
      });

      const variantShapeErrors = hasVariantsField
        ? await validateVariantPayloads(variantsInput)
        : {};

      const attributeValueShapeErrors = hasAttributeValuesField
        ? await validateAttributeValuePayloads(attributeValuesInput)
        : {};

      const combinedErrors = {
        ...dtoErrors,
        ...variantShapeErrors,
        ...attributeValueShapeErrors,
      };

      if (Object.keys(combinedErrors).length > 0) {
        throw new ApiError(422, "Validation Failed", combinedErrors);
      }

      if (body.barcode !== undefined && body.barcode !== product.barcode) {
        const isUnique = await checkBarcodeUniqueness(qr.manager, body.barcode, productId);
        if (!isUnique) {
          throw new ApiError(400, `Barcode '${body.barcode}' is already in use by another product or variant`);
        }
      }

      if (hasVariantsField && variantsInput.length > 0) {
        const refErrors = await validateVariantReferences(
          qr.manager,
          variantsInput,
          productId
        );

        if (Object.keys(refErrors).length > 0) {
          throw new ApiError(400, "Invalid variant references", refErrors);
        }
      }

      if (hasAttributeValuesField && attributeValuesInput.length > 0) {
        const refErrors = await validateAttributeValueReferences(
          qr.manager,
          attributeValuesInput
        );

        if (Object.keys(refErrors).length > 0) {
          throw new ApiError(400, "Invalid attribute value references", refErrors);
        }
      }

      const user = (req as any).user;
      const isAdmin = user?.isSuperAdmin || user?.userType === UserType.SUPER_ADMIN || user?.userType === UserType.ADMIN;

      if (!isAdmin) {
        // Find existing variants & attributes
        const variantRepo = qr.manager.getRepository(ProductVariant);
        const linkRepo = qr.manager.getRepository(ProductAttributeValueProduct);

        const currentVariants = await variantRepo.find({ where: { ProductId: product.id } });
        const currentAttributes = await linkRepo.find({ where: { ProductId: product.id } });

        const previousValues = {
          name: product.name,
          description: product.description,
          price: product.price,
          barcode: product.barcode,
          stock: product.stock,
          category: product.category,
          product_type: product.product_type,
          stock_in_hand: product.stock_in_hand,
          status: product.status,
          low_stock_threshold: product.low_stock_threshold,
          critical_stock_threshold: product.critical_stock_threshold,
          image: product.image,
          images: product.images,
          video: product.video,
          variants: currentVariants,
          attribute_values: currentAttributes
        };

        const { image, video, images } = extractUploadedFiles(req);
        const existingImagesProvided = req.body.existing_images !== undefined;

        let finalImages = product.images || [];
        if (images || existingImagesProvided) {
          const base = existingImagesProvided
            ? parseExistingImages(req.body.existing_images)
            : (product.images || []);
          finalImages = [...base, ...(images || [])];
        }

        let finalImage = product.image;
        if (image) {
          finalImage = image;
        } else if (images || existingImagesProvided) {
          finalImage = finalImages && finalImages.length > 0 ? finalImages[0] : (null as any);
        }

        const newValues = {
          name: body.name ?? product.name,
          description: body.description ?? product.description,
          price: body.price !== undefined ? Number(body.price) : product.price,
          barcode: body.barcode ?? product.barcode,
          stock: body.stock !== undefined ? Number(body.stock) : product.stock,
          category: body.category ?? product.category,
          product_type: body.product_type ?? product.product_type,
          stock_in_hand: body.stock_in_hand !== undefined ? Number(body.stock_in_hand) : product.stock_in_hand,
          status: body.status ?? product.status,
          low_stock_threshold: body.low_stock_threshold !== undefined ? Number(body.low_stock_threshold) : product.low_stock_threshold,
          critical_stock_threshold: body.critical_stock_threshold !== undefined ? Number(body.critical_stock_threshold) : product.critical_stock_threshold,
          image: finalImage,
          images: finalImages,
          video: video ?? product.video,
          variants: hasVariantsField ? variantsInput : currentVariants,
          attribute_values: hasAttributeValuesField ? attributeValuesInput : currentAttributes
        };

        const audit = {
          action: "UPDATE",
          user: user.email || user.username || `User ${user.userId}`,
          timestamp: new Date(),
          ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
          device: req.headers["user-agent"] as string,
          comment: "Product edit submission",
        };

        const approvalRepo = qr.manager.getRepository(ProductApproval);
        const approvalRequest = approvalRepo.create({
          product_id: product.id,
          branch_id: user.branchId || null,
          company_id: user.companyId || null,
          requested_by: user.email || user.username || `User ${user.userId}`,
          requested_by_id: user.userId,
          requested_date: new Date(),
          status: ApprovalStatus.PENDING,
          action_type: ApprovalActionType.UPDATE,
          previous_values: previousValues,
          new_values: newValues,
          audit_history: [audit]
        });

        await approvalRepo.save(approvalRequest);
        await qr.commitTransaction();

        // Emit realtime notifications
        try {
          const notificationRepo = dataSource.getRepository(Notification);
          const notification = notificationRepo.create({
            message: `Product "${product.name}" was modified and requires approval.`,
            type: "APPROVAL_REQUEST",
            product_id: product.id,
          });
          await notificationRepo.save(notification);
          io.emit("new-notification", notification);
        } catch (notifErr) {
          console.error("Failed to create notification on product update:", notifErr);
        }

        io.emit("approval-created", approvalRequest);

        return res.json({
          success: true,
          message: "Product update request submitted for approval",
          data: approvalRequest,
        });
      }

      // If Admin, proceed with direct update
      product.name = body.name ?? product.name;
      product.description = body.description ?? product.description;
      product.price = body.price ?? product.price;
      product.barcode = body.barcode ?? product.barcode;
      product.stock = body.stock ?? product.stock;
      product.category = body.category ?? product.category;
      product.registration_id = body.registration_id ?? product.registration_id;
      product.product_type = body.product_type ?? product.product_type;
      product.stock_in_hand = body.stock_in_hand ?? product.stock_in_hand;
      product.status = body.status ?? product.status;

      product.low_stock_threshold = body.low_stock_threshold !== undefined ? Number(body.low_stock_threshold) : product.low_stock_threshold;
      product.critical_stock_threshold = body.critical_stock_threshold !== undefined ? Number(body.critical_stock_threshold) : product.critical_stock_threshold;
      if (body.manufacture_date !== undefined) product.manufacture_date = body.manufacture_date || null;
      if (body.expiry_date !== undefined) product.expiry_date = body.expiry_date || null;

      const { image, video, images } = extractUploadedFiles(req);
      const existingImagesProvided = req.body.existing_images !== undefined;

      if (video) product.video = video;

      if (images || existingImagesProvided) {
        const base = existingImagesProvided
          ? parseExistingImages(req.body.existing_images)
          : (product.images || []);

        product.images = [...base, ...(images || [])];
      }

      if (image) {
        product.image = image;
      } else if (images || existingImagesProvided) {
        product.image = product.images && product.images.length > 0
          ? product.images[0]
          : null as unknown as string;
      }

      await repo.save(product);

      let savedVariants: ProductVariant[] | undefined;

      if (hasVariantsField) {
        const variantRepo = qr.manager.getRepository(ProductVariant);

        const existingVariants = await variantRepo.find({
          where: { ProductId: productId },
        });

        const incomingIds = new Set(
          variantsInput
            .map((v) => Number(v.Id))
            .filter((id) => !Number.isNaN(id) && id > 0)
        );

        const toDelete = existingVariants.filter(
          (existing) => !incomingIds.has(existing.Id)
        );

        if (toDelete.length > 0) {
          await variantRepo.delete(toDelete.map((v) => v.Id));
        }

        const upserted: ProductVariant[] = [];

        for (const raw of variantsInput) {
          const coerced = coerceNumbers(raw, [
            "Id",
            "CompanyId",
            "Price",
            "Stock",
            "ProductAttributeId",
            "ProductAttributeValueId",
          ]);

          const existing = coerced.Id
            ? existingVariants.find((v) => v.Id === coerced.Id)
            : undefined;

          if (existing) {
            existing.CompanyId = coerced.CompanyId ?? existing.CompanyId;
            existing.Barcode = coerced.Barcode ?? existing.Barcode;
            existing.Price = coerced.Price;
            existing.Stock = coerced.Stock;
            existing.ProductAttributeId = coerced.ProductAttributeId;
            existing.ProductAttributeValueId = coerced.ProductAttributeValueId;
            upserted.push(await variantRepo.save(existing));
          } else {
            const created = variantRepo.create({
              CompanyId: coerced.CompanyId ?? 0,
              ProductId: productId,
              Barcode: coerced.Barcode,
              Price: coerced.Price,
              Stock: coerced.Stock,
              ProductAttributeId: coerced.ProductAttributeId,
              ProductAttributeValueId: coerced.ProductAttributeValueId,
            });
            upserted.push(await variantRepo.save(created));
          }
        }

        savedVariants = upserted;
      }

      let savedAttributeValues: any[] | undefined;

      if (hasAttributeValuesField) {
        const linkRepo = qr.manager.getRepository(ProductAttributeValueProduct);

        await linkRepo.delete({ ProductId: productId });

        const linkEntities = attributeValuesInput.map((item) => {
          const coerced = coerceNumbers(item, ["ProductAttributeValueId"]);
          return linkRepo.create({
            ProductId: productId,
            ProductAttributeValueId: coerced.ProductAttributeValueId,
          });
        });

        const savedLinks =
          linkEntities.length > 0 ? await linkRepo.save(linkEntities) : [];

        savedAttributeValues = savedLinks.map((link, i) => ({
          Id: link.Id,
          ProductAttributeId: coerceNumbers(attributeValuesInput[i], [
            "ProductAttributeId",
          ]).ProductAttributeId,
          ProductAttributeValueId: link.ProductAttributeValueId,
        }));
      }

      await qr.commitTransaction();

      const responseData: any = sanitizeProduct(product);
      if (savedVariants) responseData.variants = savedVariants;
      if (savedAttributeValues !== undefined) {
        responseData.attribute_values = savedAttributeValues;
      }

      io.emit("product-updated", responseData);

      return res.json({
        success: true,
        message: "Updated successfully",
        data: responseData,
      });
    } catch (err) {
      await qr.rollbackTransaction();
      next(err);
    } finally {
      await qr.release();
    }
  }

  // ================= DELETE =================
  @Delete("/:id")
  async delete(req: Request, res: Response, next: NextFunction) {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const productId = Number(req.params.id);
      const repo = qr.manager.getRepository(Product);
      const product = await repo.findOneBy({ id: productId });

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      const permanent = req.query.permanent === "true";
      if (permanent) {
        await qr.manager
          .getRepository(ProductVariant)
          .delete({ ProductId: productId });

        await qr.manager
          .getRepository(ProductAttributeValueProduct)
          .delete({ ProductId: productId });

        await repo.delete(productId);
      } else {
        product.is_deleted = true;
        product.deleted_at = new Date();
        await repo.save(product);
      }

      await qr.commitTransaction();

      io.emit("product-deleted", { id: productId, permanent });

      return res.json({
        success: true,
        message: permanent ? "Product permanently deleted" : "Product soft deleted successfully",
      });
    } catch (err) {
      await qr.rollbackTransaction();
      next(err);
    } finally {
      await qr.release();
    }
  }

  // ================= RESTORE =================
  @Put("/:id/restore")
  async restore(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = Number(req.params.id);
      const repo = dataSource.getRepository(Product);
      const product = await repo.findOneBy({ id: productId });

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      product.is_deleted = false;
      product.deleted_at = null;
      await repo.save(product);

      io.emit("product-restored", { id: productId });

      return res.json({
        success: true,
        message: "Product restored successfully",
        data: sanitizeProduct(product),
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= TOGGLE STATUS =================
  @Put("/:id/status")
  async toggleStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = Number(req.params.id);
      const repo = dataSource.getRepository(Product);
      const product = await repo.findOneBy({ id: productId });

      if (!product) {
        throw new ApiError(404, "Product not found");
      }

      if (req.body.status) {
        product.status = req.body.status;
      } else {
        product.status =
          product.status === "active" ? ("inactive" as any) : ("active" as any);
      }

      await repo.save(product);
      io.emit("product-updated", sanitizeProduct(product));

      return res.json({
        success: true,
        message: `Product status updated to ${product.status}`,
        data: sanitizeProduct(product),
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= EXPORT PRODUCTS =================
  @Get("/export")
  async exportProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const repo = dataSource.getRepository(Product);
      const products = await repo.find({
        where: { is_deleted: false },
        relations: {
          variants: {
            ProductAttribute: true,
            ProductAttributeValue: true,
          },
        },
        order: { id: "DESC" },
      });

      const format = String(req.query.format || "json").toLowerCase();
      if (format === "csv") {
        const csvRows = [
          [
            "ID",
            "Name",
            "Barcode",
            "Price",
            "Stock",
            "Category",
            "Product Type",
            "Status",
            "Approval Status",
          ],
        ];
        for (const p of products) {
          csvRows.push([
            String(p.id),
            `"${(p.name || "").replace(/"/g, '""')}"`,
            `"${(p.barcode || "").replace(/"/g, '""')}"`,
            String(p.price),
            String(p.stock),
            `"${(p.category || "").replace(/"/g, '""')}"`,
            p.product_type,
            p.status,
            p.approval_status,
          ]);
        }
        res.header("Content-Type", "text/csv");
        res.attachment("products.csv");
        return res.send(csvRows.map((row) => row.join(",")).join("\n"));
      }

      return res.json({
        success: true,
        message: "Products exported successfully",
        data: sanitizeProducts(products),
      });
    } catch (err) {
      next(err);
    }
  }

  // ================= IMPORT PRODUCTS =================
  @Post("/import")
  async importProducts(req: Request, res: Response, next: NextFunction) {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const productsData = Array.isArray(req.body.products)
        ? req.body.products
        : typeof req.body.products === "string"
        ? JSON.parse(req.body.products)
        : [];

      if (!Array.isArray(productsData) || productsData.length === 0) {
        throw new ApiError(400, "No products provided for import");
      }

      const repo = qr.manager.getRepository(Product);
      const createdProducts: any[] = [];

      for (const item of productsData) {
        if (!item.name || item.price === undefined) {
          continue;
        }
        if (item.barcode) {
          const bcUnique = await checkBarcodeUniqueness(
            qr.manager,
            String(item.barcode).trim()
          );
          if (!bcUnique) {
            throw new ApiError(
              400,
              `Product with barcode '${item.barcode}' already exists.`
            );
          }
        }
        const product = repo.create({
          name: String(item.name).trim(),
          description: item.description ? String(item.description).trim() : null,
          price: Number(item.price) || 0,
          stock: Number(item.stock) || 0,
          stock_in_hand: Number(item.stock) || 0,
          barcode: item.barcode ? String(item.barcode).trim() : null,
          category: item.category ? String(item.category).trim() : null,
          product_type: item.product_type || "single",
          status: item.status || "active",
          approval_status: item.approval_status || "published",
          registration_id: Number(req.body.registration_id || item.registration_id || 1),
        });
        await repo.save(product);
        createdProducts.push(product);
      }

      await qr.commitTransaction();
      return res.json({
        success: true,
        message: `Successfully imported ${createdProducts.length} product(s)`,
        data: sanitizeProducts(createdProducts),
      });
    } catch (err) {
      await qr.rollbackTransaction();
      next(err);
    } finally {
      await qr.release();
    }
  }

  // ================= APPROVE PRODUCT =================
  async approveProduct(req: any, res: Response, next: NextFunction) {
    try {
      const productId = Number(req.params.id);
      const { action, comment } = req.body;
      const user = req.user;

      if (action === "PUBLISH") {
        const productRepo = dataSource.getRepository(Product);
        const product = await productRepo.findOneBy({ id: productId });
        if (!product) {
          return res.status(404).json({ success: false, message: "Product not found" });
        }
        product.approval_status = ProductApprovalStatus.PUBLISHED;
        await productRepo.save(product);

        const approvalRepo = dataSource.getRepository(ProductApproval);
        const approval = await approvalRepo.findOne({
          where: { product_id: productId }
        });
        if (approval) {
          const audit = {
            action: "PUBLISH",
            user: user.email || user.username || `User ${user.userId}`,
            timestamp: new Date(),
            ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.ip,
            device: req.headers["user-agent"] as string,
            comment: comment || "Product published",
          };
          approval.audit_history = approval.audit_history ? [...approval.audit_history, audit] : [audit];
          await approvalRepo.save(approval);
        }

        return res.json({ success: true, message: "Product published successfully", data: product });
      }

      const approvalRepo = dataSource.getRepository(ProductApproval);
      const pendingApproval = await approvalRepo.findOne({
        where: { product_id: productId, status: ApprovalStatus.PENDING }
      });

      if (!pendingApproval) {
        return res.status(404).json({ success: false, message: "Pending approval request not found for this product" });
      }

      if (req.body.rejection_reason && !req.body.comment) {
        req.body.comment = req.body.rejection_reason;
      }

      req.params.id = String(pendingApproval.id);

      const { ApprovalsController } = require("./approvals.Controller");
      const approvalsControllerInstance = new ApprovalsController();
      return approvalsControllerInstance.takeAction(req, res, next);
    } catch (err) {
      next(err);
    }
  }
}
