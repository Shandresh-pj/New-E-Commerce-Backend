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
import { IsNull } from "typeorm";


import { CreateCategoryDto } from "../dto/category.dto";
import { Category } from "../entities/category";

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

    const repo =
      dataSource.getRepository(Category);

    const category =
      repo.create({
        ...req.body,
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

    const data =
      await dataSource
        .getRepository(Category)
        .find({
          relations: {
            parent:true,
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

    const data =
      await dataSource
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

    const repo =
      dataSource.getRepository(Category);

    await repo.update(
      Number(req.params.id),
      {
        ...req.body,
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

    await dataSource
      .getRepository(Category)
      .delete(
        Number(req.params.id)
      );

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

    const data =
      await dataSource
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

    const data =
      await dataSource
        .getRepository(Category)
        .find({
          where: {
            parent_id:
              Number(
                req.params.parent_id
              ),
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

    const data =
      await dataSource
        .getRepository(Category)
        .find({
          where: {
            parent_id: IsNull(),
          },
          relations:{ 
            children : true}
          ,
        });

    return res.json({
      success: true,
      data,
    });
  }
}