import {
  Request,
  Response,
  NextFunction,
} from "express";

import { dataSource } from "../server";
import {
  ProductAttribute,
  ProductAttributeValue,
  ProductAttributeValueProduct,
} from "../entities/productAttribute";

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

const withValueTranslations = (value: ProductAttributeValue) => ({
  ...value,
  ProductAttributeValueTranslations: [
    { LanguagesId: null, Name: value?.Name ?? "" },
  ],
});

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

      const repo = dataSource.getRepository(ProductAttribute);

      const [rows, totalItems] = await repo.findAndCount({
        order: { Id: "DESC" },
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
      const AttributeNameCode = request.body.AttributeNameCode;
      const Name = nameFromTranslations(
        request.body.ProductAttributeTranslations,
        request.body.Name
      );

      const repo = dataSource.getRepository(ProductAttribute);

      const existing = await repo.findOne({
        where: { CompanyId, AttributeNameCode },
      });

      if (existing) {
        return response.status(400).json({
          success: false,
          message: "Product attribute already exists",
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
        attribute.AttributeNameCode = request.body.AttributeNameCode;
      }
      attribute.Name = nameFromTranslations(
        request.body.ProductAttributeTranslations,
        request.body.Name ?? attribute.Name
      );

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

      const repo = dataSource.getRepository(ProductAttributeValue);

      const where: any = {};
      if (request.query.ProductAttributeId) {
        where.ProductAttributeId = Number(request.query.ProductAttributeId);
      }

      const [rows, totalItems] = await repo.findAndCount({
        where,
        order: { Id: "DESC" },
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
        .findOne({ where: { Id } });

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
      const AttributeValueCode = request.body.AttributeValueCode;
      const Name = nameFromTranslations(
        request.body.ProductAttributeValueTranslations,
        request.body.Name
      );
      const product_ids = request.body.product_ids;

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

      const existing = await valueRepo.findOne({
        where: { CompanyId, ProductAttributeId, AttributeValueCode },
      });

      if (existing) {
        await queryRunner.rollbackTransaction();
        return response.status(400).json({
          success: false,
          message: "Product attribute value already exists",
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

      if (request.body.AttributeValueCode !== undefined) {
        value.AttributeValueCode = request.body.AttributeValueCode;
      }
      if (request.body.ProductAttributeId !== undefined) {
        value.ProductAttributeId = Number(request.body.ProductAttributeId);
      }
      value.Name = nameFromTranslations(
        request.body.ProductAttributeValueTranslations,
        request.body.Name ?? value.Name
      );

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
