import {
  Request,
  Response,
} from "express";

import {
  Controller,
  Get,
  Post,
  Delete,
  Middleware,
  Swagger,
} from "../decorators";

import { Put } from "../decorators/put";

import validate from "../middleware/validate";

import dataSource from "../config/database";
import { IsNull, Raw, Not } from "typeorm";


import { CreateCategoryDto } from "../dto/category.dto";
import { Category } from "../entities/category";
import { Product, Cart } from "../entities/products";

@Controller("/categories")
export class CategoryController {

  // ==========================================
  // CREATE CATEGORY
  // ==========================================

  @Post("/create")
  @Middleware([
    validate(CreateCategoryDto),
  ])
  @Swagger(
    "Create Category",
    "Create Parent / Child Category"
  )
  async create(
    req: Request,
    res: Response
  ) {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const parent_id = req.body.parent_id !== undefined && req.body.parent_id !== null && req.body.parent_id !== "" ? Number(req.body.parent_id) : null;
    const repo = dataSource.getRepository(Category);

    const existingWhere: any = {
      name: Raw((alias) => `LOWER(${alias}) = :name`, { name: name.toLowerCase() }),
      parent_id: parent_id === null ? IsNull() : parent_id,
    };

    const existing = await repo.findOne({ where: existingWhere });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A category with this name already exists in this hierarchy level",
      });
    }

    const category = repo.create({
      ...req.body,
      name,
      parent_id,
      ...(req.file
        ? { image: `/uploads/images/${req.file.filename}` }
        : {}),
    });

    await repo.save(category);

    return res.json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  }

  // ==========================================
  // GET ALL CATEGORIES
  // ==========================================

  @Get("/")
  @Swagger(
    "Get Categories",
    "Get all categories"
  )
  async getAll(
    req: Request,
    res: Response
  ) {
    const search = String(req.query.search || "").trim();
    const status = req.query.status;
    const parent_id = req.query.parent_id;

    const where: any = {};
    if (search) {
      where.name = Raw((alias) => `LOWER(${alias}) LIKE :search`, { search: `%${search.toLowerCase()}%` });
    }
    if (parent_id !== undefined && parent_id !== "all") {
      where.parent_id = parent_id === "null" || parent_id === "" ? IsNull() : Number(parent_id);
    }
    if (status !== undefined && status !== "all" && status !== "") {
      if (status === "true" || status === "false") {
        where.status = status === "true";
      } else if (!isNaN(Number(status))) {
        where.StatusId = Number(status);
      }
    }

    const data = await dataSource
      .getRepository(Category)
      .find({
        where,
        relations: {
          parent: true,
        },
        order: {
          id: "DESC",
        },
      });

    return res.json({
      success: true,
      data,
    });
  }

  // ==========================================
  // GET CATEGORY BY ID
  // ==========================================

  @Get("/:id")
  @Swagger(
    "Get Category",
    "Get category details"
  )
  async getOne(
    req: Request,
    res: Response
  ) {
    const data = await dataSource
      .getRepository(Category)
      .findOne({
        where: {
          id: Number(req.params.id),
        },
        relations: {
          parent: true,
          children: true,
        },
      });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({
      success: true,
      data,
    });
  }

  // ==========================================
  // UPDATE CATEGORY
  // ==========================================

  @Put("/:id")
  @Middleware([
    validate(CreateCategoryDto),
  ])
  @Swagger(
    "Update Category",
    "Update Parent / Child Category"
  )
  async update(
    req: Request,
    res: Response
  ) {
    const id = Number(req.params.id);
    const repo = dataSource.getRepository(Category);

    const existingCat = await repo.findOne({ where: { id } });
    if (!existingCat) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const name = req.body.name !== undefined ? String(req.body.name).trim() : existingCat.name;
    const parent_id = req.body.parent_id !== undefined ? (req.body.parent_id !== null && req.body.parent_id !== "" ? Number(req.body.parent_id) : null) : existingCat.parent_id;

    if (parent_id === id) {
      return res.status(400).json({
        success: false,
        message: "A category cannot be set as its own parent",
      });
    }

    const dupWhere: any = {
      name: Raw((alias) => `LOWER(${alias}) = :name`, { name: name.toLowerCase() }),
      parent_id: parent_id === null ? IsNull() : parent_id,
      id: Not(id),
    };

    const duplicate = await repo.findOne({ where: dupWhere });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "A category with this name already exists in this hierarchy level",
      });
    }

    await repo.update(
      id,
      {
        ...req.body,
        name,
        parent_id,
        ...(req.file
          ? { image: `/uploads/images/${req.file.filename}` }
          : {}),
      }
    );

    return res.json({
      success: true,
      message: "Category updated successfully",
    });
  }

  // ==========================================
  // TOGGLE STATUS
  // ==========================================

  @Put("/:id/status")
  @Swagger(
    "Toggle Category Status",
    "Toggle category status"
  )
  async toggleStatus(
    req: Request,
    res: Response
  ) {
    const id = Number(req.params.id);
    const repo = dataSource.getRepository(Category);
    const category = await repo.findOne({ where: { id } });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    if (req.body.status !== undefined) {
      category.status = Boolean(req.body.status);
    } else if (req.body.StatusId !== undefined) {
      category.StatusId = Number(req.body.StatusId);
    } else {
      category.status = !category.status;
    }

    await repo.save(category);

    return res.json({
      success: true,
      message: "Category status updated successfully",
      data: category,
    });
  }

  // ==========================================
  // DELETE CATEGORY
  // ==========================================

  @Delete("/:id")
  @Swagger(
    "Delete Category",
    "Delete category"
  )
  async delete(
    req: Request,
    res: Response
  ) {
    const id = Number(req.params.id);
    const repo = dataSource.getRepository(Category);

    const category = await repo.findOne({ where: { id } });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const childCount = await repo.count({ where: { parent_id: id } });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${childCount} child subcategor(ies) exist under this category. Please delete or reassign them first.`,
      });
    }

    const productRepo = dataSource.getRepository(Product);
    const productCount = await productRepo.count({
      where: { category: category.name },
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${productCount} product(s) are currently assigned to this category. Please reassign the products first.`,
      });
    }

    const cartRepo = dataSource.getRepository(Cart);
    const cartCount = await cartRepo.count({
      where: { category_id: id },
    });

    if (cartCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${cartCount} cart item(s) reference this category.`,
      });
    }

    await repo.delete(id);

    return res.json({
      success: true,
      message: "Category deleted successfully",
    });
  }

  // ==========================================
  // GET PARENT CATEGORIES
  // ==========================================

  @Get("/parents/list")
  @Swagger(
    "Parent Categories",
    "Get all parent categories"
  )
  async parentCategories(
    req: Request,
    res: Response
  ) {
    const data = await dataSource
      .getRepository(Category)
      .find({
        where: {
          parent_id: IsNull(),
        },
        order: {
          id: "DESC",
        },
      });

    return res.json({
      success: true,
      data,
    });
  }

  // ==========================================
  // GET CHILD CATEGORIES
  // ==========================================

  @Get("/children/:parent_id")
  @Swagger(
    "Child Categories",
    "Get child categories"
  )
  async childCategories(
    req: Request,
    res: Response
  ) {
    const data = await dataSource
      .getRepository(Category)
      .find({
        where: {
          parent_id: Number(req.params.parent_id),
        },
        order: {
          id: "DESC",
        },
      });

    return res.json({
      success: true,
      data,
    });
  }

  // ==========================================
  // CATEGORY TREE
  // ==========================================

  @Get("/tree/list")
  @Swagger(
    "Category Tree",
    "Get Parent with Child Categories"
  )
  async tree(
    req: Request,
    res: Response
  ) {
    const data = await dataSource
      .getRepository(Category)
      .find({
        where: {
          parent_id: IsNull(),
        },
        relations: {
          children: true,
        },
      });

    return res.json({
      success: true,
      data,
    });
  }
}