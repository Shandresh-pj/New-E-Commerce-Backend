import {
  Request,
  Response,
  NextFunction,
} from "express";
import { plainToInstance } from "class-transformer";
import { validate as classValidate } from "class-validator";

import {
  Controller,
  Post,
  Get,
  Delete,
  Middleware,
  Swagger,
} from "../decorators";

import { dataSource } from "../server";
import { uploadAny } from "../utils/upload";
import { Product } from "../entities/products";
import { ProductVariant } from "../entities/productVariant";
import { ProductAttribute, ProductAttributeValue } from "../entities/productAttribute";
import { ApiError } from "../exceptions/ApiError";
import { applyPagination, paginationResponse } from "../utils/controllerFunctions";
import {
  CreateProductDto,
  UpdateProductDto,
  ProductVariantDto,
  ScanProductDto,
} from "../dto";
import { Put } from "../decorators/put";

const PRODUCT_RELATIONS = {
  creator: true,
  couponProducts: true,
  variants: {
    ProductAttribute: true,
    ProductAttributeValue: true,
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
const OPTIONAL_STRING_FIELDS = ["description", "barcode", "category"];

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
 * Parse the `variants` field, which may arrive as a real array (JSON
 * request body) or as a JSON string (multipart/form-data field).
 */
const parseVariantsInput = (raw: any): any[] => {
  if (raw === undefined || raw === null || raw === "") return [];

  if (Array.isArray(raw)) return raw;

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new ApiError(422, "variants must be a JSON array");
      }
      return parsed;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(422, "Invalid JSON in variants field");
    }
  }

  throw new ApiError(422, "variants must be an array");
};

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
 * Confirm every referenced ProductAttributeId / ProductAttributeValueId
 * pair actually exists and belongs together.
 */
const validateVariantReferences = async (
  manager: any,
  variants: any[]
): Promise<Record<string, string[]>> => {
  const errors: Record<string, string[]> = {};

  const attributeRepo = manager.getRepository(ProductAttribute);
  const valueRepo = manager.getRepository(ProductAttributeValue);

  for (let i = 0; i < variants.length; i++) {
    const variant = coerceNumbers(variants[i], [
      "ProductAttributeId",
      "ProductAttributeValueId",
    ]);

    const attribute = await attributeRepo.findOne({
      where: { Id: variant.ProductAttributeId },
    });

    if (!attribute) {
      errors[`variants[${i}].ProductAttributeId`] = [
        "ProductAttribute not found",
      ];
      continue;
    }

    const value = await valueRepo.findOne({
      where: {
        Id: variant.ProductAttributeValueId,
        ProductAttributeId: variant.ProductAttributeId,
      },
    });

    if (!value) {
      errors[`variants[${i}].ProductAttributeValueId`] = [
        "ProductAttributeValue not found for the given ProductAttributeId",
      ];
    }
  }

  return errors;
};

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

/**
 * Parses the optional `existing_images` field — the gallery URLs the
 * client wants to keep (after any deletions made in the UI). Lets update
 * actually shrink/replace the gallery instead of only ever appending.
 * Absent entirely => fall back to whatever is already on the product
 * (old append-only behaviour, for clients that don't send this field).
 */
/**
 * `stock` stays on the entity and drives order/low-stock business logic,
 * but the admin UI only ever shows `stock_in_hand` — strip it (and the
 * legacy `qr_code` key, in case it still lingers on an un-synced DB row)
 * out of anything sent back to clients.
 */
const HIDDEN_RESPONSE_FIELDS = ["stock", "qr_code"];

const sanitizeProduct = (product: any): any => {
  if (!product) return product;
  const { ...rest } = product;
  HIDDEN_RESPONSE_FIELDS.forEach((key) => delete rest[key]);
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

      const body = normalizeEmptyStrings(
        coerceNumbers(req.body, [
          "price",
          "stock",
          "stock_in_hand",
          "registration_id",
        ])
      );

      const dtoErrors = await validateAgainstDto(CreateProductDto, {
        ...body,
        variants: undefined,
      });

      const variantShapeErrors = await validateVariantPayloads(variantsInput);

      const combinedErrors = { ...dtoErrors, ...variantShapeErrors };

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
      } = body;

      const { image, video, images } = extractUploadedFiles(req);

      const product = repo.create({
        name,
        description,
        price,
        stock,
        barcode,
        category,
        registration_id,
        product_type,
        stock_in_hand,
        status,
        // Fall back to the first gallery photo as the cover when no
        // dedicated cover file was uploaded separately.
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

      await qr.commitTransaction();

      return res.status(201).json({
        success: true,
        message: "Product created",
        data: { ...sanitizeProduct(product), variants: savedVariants },
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
        .orderBy("product.id", "DESC");

      if (req.query.status) {
        qb.andWhere("product.status = :status", { status: req.query.status });
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
        qb.andWhere("product.name LIKE :search", {
          search: `%${req.query.search}%`,
        });
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

      const body = normalizeEmptyStrings(
        coerceNumbers(req.body, [
          "price",
          "stock",
          "stock_in_hand",
          "registration_id",
        ])
      );

      const dtoErrors = await validateAgainstDto(UpdateProductDto, {
        ...body,
        variants: undefined,
      });

      const variantShapeErrors = hasVariantsField
        ? await validateVariantPayloads(variantsInput)
        : {};

      const combinedErrors = { ...dtoErrors, ...variantShapeErrors };

      if (Object.keys(combinedErrors).length > 0) {
        throw new ApiError(422, "Validation Failed", combinedErrors);
      }

      if (hasVariantsField && variantsInput.length > 0) {
        const refErrors = await validateVariantReferences(
          qr.manager,
          variantsInput
        );

        if (Object.keys(refErrors).length > 0) {
          throw new ApiError(400, "Invalid variant references", refErrors);
        }
      }

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
        // Keep the cover in sync with the gallery when no dedicated cover
        // file was uploaded separately — including clearing it once the
        // gallery is emptied out, instead of leaving a stale cover image.
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

      await qr.commitTransaction();

      return res.json({
        success: true,
        message: "Updated successfully",
        data: savedVariants
          ? { ...sanitizeProduct(product), variants: savedVariants }
          : sanitizeProduct(product),
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

      await qr.manager
        .getRepository(ProductVariant)
        .delete({ ProductId: productId });

      await repo.delete(productId);

      await qr.commitTransaction();

      return res.json({
        success: true,
        message: "Deleted",
      });
    } catch (err) {
      await qr.rollbackTransaction();
      next(err);
    } finally {
      await qr.release();
    }
  }
}
