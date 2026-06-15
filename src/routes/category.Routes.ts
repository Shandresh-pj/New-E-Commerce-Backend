import { Router } from "express";
import {
  categoryController,
} from "../controllers";
import { uploadImage } from "../utils/upload";

const router = Router();

/**
 * @swagger
 * /categories/create:
 *   post:
 *     summary: Create Category
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category created successfully
 */
router.post(
  "/categories/create",uploadImage.upload.single("image"),uploadImage.compressor,
  categoryController.create.bind(
    categoryController
  )
);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get Categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Categories fetched successfully
 */
router.get(
  "/categories",
  categoryController.getAll.bind(
    categoryController
  )
);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get Category By Id
 *     tags: [Categories]
 */
router.get(
  "/categories/:id",
  categoryController.getOne.bind(
    categoryController
  )
);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update Category
 *     tags: [Categories]
 */
router.put(
  "/categories/:id",uploadImage.upload.single("image"),uploadImage.compressor,
  categoryController.update.bind(
    categoryController
  )
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete Category
 *     tags: [Categories]
 */
router.delete(
  "/categories/:id",
  categoryController.delete.bind(
    categoryController
  )
);

/**
 * @swagger
 * /categories/parents/list:
 *   get:
 *     summary: Get Parent Categories
 *     tags: [Categories]
 */
router.get(
  "/categories/parents/list",
  categoryController.parentCategories.bind(
    categoryController
  )
);

/**
 * @swagger
 * /categories/children/{parent_id}:
 *   get:
 *     summary: Get Child Categories
 *     tags: [Categories]
 */
router.get(
  "/categories/children/:parent_id",
  categoryController.childCategories.bind(
    categoryController
  )
);

/**
 * @swagger
 * /categories/tree/list:
 *   get:
 *     summary: Get Category Tree
 *     tags: [Categories]
 */
router.get(
  "/categories/tree/list",
  categoryController.tree.bind(
    categoryController
  )
);

export default router;