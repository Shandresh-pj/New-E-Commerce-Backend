import { Router } from "express";
import {
  categoryController,
} from "../controllers";
import { uploadImage } from "../utils/upload";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /categories/create:
 *   post:
 *     summary: Create Category
 *     description: Create a new product category or subcategory with image upload.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Set Top Boxes"
 *                 description: Category Name (Required)
 *               slug:
 *                 type: string
 *                 example: "set-top-boxes"
 *                 description: Custom URL Slug (Optional)
 *               parentId:
 *                 type: string
 *                 example: "cat_01"
 *                 description: Parent Category ID for subcategories (Optional)
 *               description:
 *                 type: string
 *                 example: "DTH satellite receivers and accessories"
 *                 description: Category description (Optional)
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Category icon/image file (Optional)
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Category name already exists
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/categories/create",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER] }),
  uploadImage.upload.single("image"), uploadImage.compressor,
  auditMiddleware("CATEGORY"),
  categoryController.create.bind(categoryController)
);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get All Categories
 *     description: Retrieve flat list of all active categories.
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
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
 *     summary: Get Category By ID
 *     description: Retrieve category details by ID or slug.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID (Required)
 *     responses:
 *       200:
 *         description: Category details found
 *       404:
 *         description: Category not found
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
 *     description: Modify category title, parent reference, or image attachment.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID (Required)
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Set Top Boxes"
 *               parentId:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       404:
 *         description: Category not found
 */
router.put(
  "/categories/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER] }),
  uploadImage.upload.single("image"), uploadImage.compressor,
  auditMiddleware("CATEGORY"),
  categoryController.update.bind(categoryController)
);

/**
 * @swagger
 * /categories/{id}/status:
 *   put:
 *     summary: Toggle Category Active Status
 *     description: Enable or disable category visibility in store front.
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Category ID (Required)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: boolean
 *                 example: true
 *                 description: New active status flag
 *     responses:
 *       200:
 *         description: Category status updated successfully
 *       400:
 *         description: Invalid status value
 *       404:
 *         description: Category not found
 */
router.put(
  "/categories/:id/status",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER] }),
  auditMiddleware("CATEGORY"),
  categoryController.toggleStatus.bind(categoryController)
);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete Category
 *     description: Delete a category by ID (Admin only).
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID (Required)
 *     responses:
 *       200:
 *         description: Category deleted
 *       404:
 *         description: Category not found
 */
router.delete(
  "/categories/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  auditMiddleware("CATEGORY"),
  categoryController.delete.bind(categoryController)
);

/**
 * @swagger
 * /categories/parents/list:
 *   get:
 *     summary: Get Top-Level Parent Categories
 *     description: Retrieve list of root level categories (categories with no parent).
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Parent categories list
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
 *     summary: Get Subcategories By Parent ID
 *     description: Retrieve direct child subcategories under a specific parent ID.
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: parent_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parent Category ID (Required)
 *     responses:
 *       200:
 *         description: Subcategories list
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
 *     summary: Get Complete Nested Category Tree
 *     description: Retrieve full hierarchical category tree structure.
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Hierarchical category tree
 */
router.get(
  "/categories/tree/list",
  categoryController.tree.bind(
    categoryController
  )
);

export default router;