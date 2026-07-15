import {
  Request,
  Response,
  NextFunction,
} from "express";
import { Raw, Not } from "typeorm";

import dataSource from "../config/database";
import {
  ProductAttribute,
  ProductAttributeValue,
  ProductAttributeValueProduct,
} from "../entities/productAttribute";
import { ProductVariant } from "../entities/productVariant";

/**
 * Helpers to bridge the single stored `Name` column to/from the
 * translation-array shape the Angular admin UI expects (no DB translation
 * tables are used).
 */
const nameFromTranslations = (
  translations: any,
  fallback?: any
): string => {
  if (Array.isArray(translations) && translations.length > 0) {
    const withName = translations.find((t: any) => t?.Name);
    if (withName) return withName.Name;
  }
  return fallback ?? "";
};

const withAttributeTranslations = (attribute: ProductAttribute) => ({
  ...attribute,
  ProductAttributeTranslations: [
    { LanguagesId: null, Name: attribute?.Name ?? "" },
  ],
});

/**
 * Surfaces the ProductAttributeValueProduct junction rows (when loaded via
 * the `ProductLinks` relation) as a plain `product_ids` array, so a client
 * that wants to add this product to the existing set can fetch the
 * current links first and merge instead of blindly overwriting them via
 * Update's `product_ids` field.
 */
const withValueTranslations = (value: ProductAttributeValue) => {
  const { ProductLinks, ...rest } = value as any;
  return {
    ...rest,
    ProductAttributeValueTranslations: [
      { LanguagesId: null, Name: value?.Name ?? "" },
    ],
    product_ids: Array.isArray(ProductLinks)
      ? ProductLinks.map((link: any) => link.ProductId)
      : [],
  };
};

const getPaging = (req: Request) => {
  const currentPage = Number(req.query.page) || 1;
  const pageSize = Number(req.query.limit) || 10;
  return { currentPage, pageSize, skip: (currentPage - 1) * pageSize };
};

export class ProductAttributeController {

  // ================= LIST =================
  public async index(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const { currentPage, pageSize, skip } = getPaging(request);
      const search = String(request.query.search || "").trim();
      const sortBy = (request.query.sortBy as string) || "Id";
      const sortOrder = ((request.query.sortOrder as string) || "DESC").toUpperCase() as "ASC" | "DESC";
      const validColumns = ["Id", "AttributeNameCode", "Name", "CreatedAt"];
      const orderColumn = validColumns.includes(sortBy) ? sortBy : "Id";

      const repo = dataSource.getRepository(ProductAttribute);
      const where: any = {};
      if (search) {
        where.Name = Raw((alias) => `LOWER(${alias}) LIKE :search`, { search: `%${search.toLowerCase()}%` });
      }

      const [rows, totalItems] = await repo.findAndCount({
        where,
        order: { [orderColumn]: sortOrder },
        skip,
        take: pageSize,
      });

      return response.json({
        success: true,
        message: "Product attributes fetched successfully",
        data: {
          totalItems,
          currentPage,
          pageSize,
          totalPages: Math.ceil(totalItems / pageSize),
          data: rows.map(withAttributeTranslations),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= DETAIL =================
  public async detail(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const Id = Number(request.params.Id);

      const attribute = await dataSource
        .getRepository(ProductAttribute)
        .findOne({ where: { Id } });

      if (!attribute) {
        return response.status(404).json({
          success: false,
          message: "Product attribute not found",
        });
      }

      return response.json({
        success: true,
        message: "Product attribute fetched successfully",
        data: withAttributeTranslations(attribute),
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= ADD =================
  public async create(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const CompanyId = Number(request.body.CompanyId) || 0;
      const AttributeNameCode = String(request.body.AttributeNameCode || "").trim();
      const Name = nameFromTranslations(
        request.body.ProductAttributeTranslations,
        request.body.Name
      ).trim();

      if (!AttributeNameCode || !Name) {
        return response.status(400).json({
          success: false,
          message: "Attribute code and name are required",
        });
      }

      const repo = dataSource.getRepository(ProductAttribute);

      const existingCode = await repo.findOne({
        where: {
          CompanyId,
          AttributeNameCode: Raw((alias) => `LOWER(${alias}) = :code`, { code: AttributeNameCode.toLowerCase() }),
        },
      });

      if (existingCode) {
        return response.status(400).json({
          success: false,
          message: "Product attribute with this code already exists",
        });
      }

      const existingName = await repo.findOne({
        where: {
          CompanyId,
          Name: Raw((alias) => `LOWER(${alias}) = :name`, { name: Name.toLowerCase() }),
        },
      });

      if (existingName) {
        return response.status(400).json({
          success: false,
          message: "Product attribute with this name already exists",
        });
      }

      const attribute = repo.create({
        CompanyId,
        AttributeNameCode,
        Name,
      });

      await repo.save(attribute);

      return response.json({
        success: true,
        message: "Product attribute added successfully",
        data: { Id: attribute.Id },
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= UPDATE =================
  public async update(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const Id = Number(request.params.Id);
      const repo = dataSource.getRepository(ProductAttribute);

      const attribute = await repo.findOne({ where: { Id } });

      if (!attribute) {
        return response.status(404).json({
          success: false,
          message: "Product attribute not found",
        });
      }

      if (request.body.AttributeNameCode !== undefined) {
        const code = String(request.body.AttributeNameCode).trim();
        if (!code) {
          return response.status(400).json({ success: false, message: "Attribute code cannot be empty" });
        }
        const existing = await repo.findOne({
          where: {
            CompanyId: attribute.CompanyId,
            AttributeNameCode: Raw((alias) => `LOWER(${alias}) = :code`, { code: code.toLowerCase() }),
            Id: Not(Id),
          },
        });
        if (existing) {
          return response.status(400).json({ success: false, message: "Product attribute with this code already exists" });
        }
        attribute.AttributeNameCode = code;
      }

      const newName = nameFromTranslations(
        request.body.ProductAttributeTranslations,
        request.body.Name ?? attribute.Name
      ).trim();

      if (newName !== attribute.Name) {
        const existingName = await repo.findOne({
          where: {
            CompanyId: attribute.CompanyId,
            Name: Raw((alias) => `LOWER(${alias}) = :name`, { name: newName.toLowerCase() }),
            Id: Not(Id),
          },
        });
        if (existingName) {
          return response.status(400).json({ success: false, message: "Product attribute with this name already exists" });
        }
        attribute.Name = newName;
      }

      await repo.save(attribute);

      return response.json({
        success: true,
        message: "Product attribute updated successfully",
        data: { Id: attribute.Id },
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= DELETE =================
  public async deleteItem(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const Id = Number(request.params.Id);

      const valueCount = await dataSource
        .getRepository(ProductAttributeValue)
        .count({ where: { ProductAttributeId: Id } });

      if (valueCount > 0) {
        return response.status(400).json({
          success: false,
          message: `Cannot delete attribute: ${valueCount} attribute value(s) are currently associated with it. Please delete the values first.`,
        });
      }

      const variantCount = await dataSource
        .getRepository(ProductVariant)
        .count({ where: { ProductAttributeId: Id } });

      if (variantCount > 0) {
        return response.status(400).json({
          success: false,
          message: `Cannot delete attribute: ${variantCount} product variant(s) are currently using this attribute.`,
        });
      }

      await dataSource.getRepository(ProductAttribute).delete(Id);

      return response.json({
        success: true,
        message: "Product attribute deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

export class ProductAttributeValueController {

  // ================= LIST =================
  public async index(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const { currentPage, pageSize, skip } = getPaging(request);
      const search = String(request.query.search || "").trim();
      const sortBy = (request.query.sortBy as string) || "Id";
      const sortOrder = ((request.query.sortOrder as string) || "DESC").toUpperCase() as "ASC" | "DESC";
      const validColumns = ["Id", "AttributeValueCode", "Name", "CreatedAt"];
      const orderColumn = validColumns.includes(sortBy) ? sortBy : "Id";

      const repo = dataSource.getRepository(ProductAttributeValue);

      const where: any = {};
      if (request.query.ProductAttributeId) {
        where.ProductAttributeId = Number(request.query.ProductAttributeId);
      }
      if (search) {
        where.Name = Raw((alias) => `LOWER(${alias}) LIKE :search`, { search: `%${search.toLowerCase()}%` });
      }

      const [rows, totalItems] = await repo.findAndCount({
        where,
        relations: { ProductLinks: true },
        order: { [orderColumn]: sortOrder },
        skip,
        take: pageSize,
      });

      return response.json({
        success: true,
        message: "Product attribute values fetched successfully",
        data: {
          totalItems,
          currentPage,
          pageSize,
          totalPages: Math.ceil(totalItems / pageSize),
          data: rows.map(withValueTranslations),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= DETAIL =================
  public async detail(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const Id = Number(request.params.Id);

      const value = await dataSource
        .getRepository(ProductAttributeValue)
        .findOne({ where: { Id }, relations: { ProductLinks: true } });

      if (!value) {
        return response.status(404).json({
          success: false,
          message: "Product attribute value not found",
        });
      }

      return response.json({
        success: true,
        message: "Product attribute value fetched successfully",
        data: withValueTranslations(value),
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= ADD =================
  public async create(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const CompanyId = Number(request.body.CompanyId) || 0;
      const ProductAttributeId = Number(request.body.ProductAttributeId);
      const AttributeValueCode = String(request.body.AttributeValueCode || "").trim();
      const Name = nameFromTranslations(
        request.body.ProductAttributeValueTranslations,
        request.body.Name
      ).trim();
      const product_ids = request.body.product_ids;

      if (!ProductAttributeId || !AttributeValueCode || !Name) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({
          success: false,
          message: "Attribute, value code, and name are required",
        });
      }

      const attributeRepo =
        queryRunner.manager.getRepository(ProductAttribute);
      const valueRepo =
        queryRunner.manager.getRepository(ProductAttributeValue);
      const linkRepo =
        queryRunner.manager.getRepository(ProductAttributeValueProduct);

      const attribute = await attributeRepo.findOne({
        where: { Id: ProductAttributeId },
      });

      if (!attribute) {
        await queryRunner.rollbackTransaction();
        return response.status(404).json({
          success: false,
          message: "Product attribute not found",
        });
      }

      const existingCode = await valueRepo.findOne({
        where: {
          CompanyId,
          ProductAttributeId,
          AttributeValueCode: Raw((alias) => `LOWER(${alias}) = :code`, { code: AttributeValueCode.toLowerCase() }),
        },
      });

      if (existingCode) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({
          success: false,
          message: "Product attribute value with this code already exists for this attribute",
        });
      }

      const existingName = await valueRepo.findOne({
        where: {
          CompanyId,
          ProductAttributeId,
          Name: Raw((alias) => `LOWER(${alias}) = :name`, { name: Name.toLowerCase() }),
        },
      });

      if (existingName) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({
          success: false,
          message: "Product attribute value with this name already exists for this attribute",
        });
      }

      const value = valueRepo.create({
        CompanyId,
        ProductAttributeId,
        AttributeValueCode,
        Name,
      });

      await valueRepo.save(value);

      if (Array.isArray(product_ids) && product_ids.length > 0) {
        for (const productId of product_ids) {
          const link = linkRepo.create({
            ProductAttributeValueId: value.Id,
            ProductId: Number(productId),
          });
          await linkRepo.save(link);
        }
      }

      await queryRunner.commitTransaction();

      return response.json({
        success: true,
        message: "Product attribute value added successfully",
        data: { Id: value.Id },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      next(error);
    } finally {
      await queryRunner.release();
    }
  }

  // ================= UPDATE =================
  public async update(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const Id = Number(request.params.Id);
      const product_ids = request.body.product_ids;

      const valueRepo =
        queryRunner.manager.getRepository(ProductAttributeValue);
      const linkRepo =
        queryRunner.manager.getRepository(ProductAttributeValueProduct);

      const value = await valueRepo.findOne({ where: { Id } });

      if (!value) {
        await queryRunner.rollbackTransaction();
        return response.status(404).json({
          success: false,
          message: "Product attribute value not found",
        });
      }

      if (request.body.ProductAttributeId !== undefined) {
        value.ProductAttributeId = Number(request.body.ProductAttributeId);
      }

      if (request.body.AttributeValueCode !== undefined) {
        const code = String(request.body.AttributeValueCode).trim();
        if (!code) {
          await queryRunner.rollbackTransaction();
          return response.status(400).json({ success: false, message: "Value code cannot be empty" });
        }
        const existing = await valueRepo.findOne({
          where: {
            CompanyId: value.CompanyId,
            ProductAttributeId: value.ProductAttributeId,
            AttributeValueCode: Raw((alias) => `LOWER(${alias}) = :code`, { code: code.toLowerCase() }),
            Id: Not(Id),
          },
        });
        if (existing) {
          await queryRunner.rollbackTransaction();
          return response.status(400).json({ success: false, message: "Product attribute value with this code already exists" });
        }
        value.AttributeValueCode = code;
      }

      const newName = nameFromTranslations(
        request.body.ProductAttributeValueTranslations,
        request.body.Name ?? value.Name
      ).trim();

      if (newName !== value.Name) {
        const existingName = await valueRepo.findOne({
          where: {
            CompanyId: value.CompanyId,
            ProductAttributeId: value.ProductAttributeId,
            Name: Raw((alias) => `LOWER(${alias}) = :name`, { name: newName.toLowerCase() }),
            Id: Not(Id),
          },
        });
        if (existingName) {
          await queryRunner.rollbackTransaction();
          return response.status(400).json({ success: false, message: "Product attribute value with this name already exists" });
        }
        value.Name = newName;
      }

      await valueRepo.save(value);

      if (product_ids !== undefined) {
        await linkRepo.delete({ ProductAttributeValueId: Id });
        if (Array.isArray(product_ids)) {
          for (const productId of product_ids) {
            const link = linkRepo.create({
              ProductAttributeValueId: Id,
              ProductId: Number(productId),
            });
            await linkRepo.save(link);
          }
        }
      }

      await queryRunner.commitTransaction();

      return response.json({
        success: true,
        message: "Product attribute value updated successfully",
        data: { Id: value.Id },
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      next(error);
    } finally {
      await queryRunner.release();
    }
  }

  // ================= DELETE =================
  public async deleteItem(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const Id = Number(request.params.Id);

      const variantCount = await dataSource
        .getRepository(ProductVariant)
        .count({ where: { ProductAttributeValueId: Id } });

      if (variantCount > 0) {
        return response.status(400).json({
          success: false,
          message: `Cannot delete value: ${variantCount} product variant(s) are currently using this attribute value.`,
        });
      }

      const productLinksCount = await dataSource
        .getRepository(ProductAttributeValueProduct)
        .count({ where: { ProductAttributeValueId: Id } });

      if (productLinksCount > 0) {
        return response.status(400).json({
          success: false,
          message: `Cannot delete value: It is currently linked to ${productLinksCount} product(s). Please remove the product links first.`,
        });
      }

      await dataSource
        .getRepository(ProductAttributeValueProduct)
        .delete({ ProductAttributeValueId: Id });

      await dataSource.getRepository(ProductAttributeValue).delete(Id);

      return response.json({
        success: true,
        message: "Product attribute value deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
