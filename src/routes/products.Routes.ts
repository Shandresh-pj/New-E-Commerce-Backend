import { orderController, productController } from "../controllers";
import { uploadAny } from "../utils/upload";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const express = require("express");
const router = express.Router();

// ================= GET ALL PRODUCTS =================

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products (paginated)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: product_type
 *         schema:
 *           type: string
 *           enum: [simple, variant]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of products
 */
router.get(
  "/products",
  productController.getAll.bind(productController)
);

/**
 * @swagger
 * /products/export:
 *   get:
 *     summary: GET /products/export
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/products/export",
  productController.exportProducts.bind(productController)
);

/**
 * @swagger
 * /products/import:
 *   post:
 *     summary: POST /products/import
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/products/import",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("PRODUCT"),
  productController.importProducts.bind(productController)
);

// ================= GET PRODUCT BY ID =================

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get(
  "/products/:id",
  productController.getById.bind(productController)
);


// ================= CREATE PRODUCT =================

/**
 * @swagger
 * /products/add:
 *   post:
 *     summary: Create a new product (with optional variants)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *               category:
 *                 type: string
 *               barcode:
 *                 type: string
 *               product_type:
 *                 type: string
 *                 enum: [simple, variant]
 *               stock_in_hand:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               variants:
 *                 type: string
 *                 description: JSON string of ProductVariant[] when sent as multipart/form-data
 *                 example: '[{"CompanyId":0,"Barcode":"","Price":0,"Stock":0,"ProductAttributeId":0,"ProductAttributeValueId":0}]'
 *               image:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *               product_type:
 *                 type: string
 *                 enum: [simple, variant]
 *               stock_in_hand:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               variants:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     CompanyId:
 *                       type: number
 *                     Barcode:
 *                       type: string
 *                     Price:
 *                       type: number
 *                     Stock:
 *                       type: number
 *                     ProductAttributeId:
 *                       type: number
 *                     ProductAttributeValueId:
 *                       type: number
 *     responses:
 *       201:
 *         description: Product created successfully
 *       422:
 *         description: Validation failed
 */
router.post(
  "/products/add",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  uploadAny.upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  uploadAny.compressor,
  auditMiddleware("PRODUCT"),
  productController.create.bind(productController)
);


// ================= UPDATE PRODUCT =================

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update product by ID (replaces variants when `variants` is provided)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *               product_type:
 *                 type: string
 *                 enum: [simple, variant]
 *               stock_in_hand:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *               variants:
 *                 type: string
 *                 description: JSON string of ProductVariant[]. Existing variants not included (by Id) are deleted; entries without Id are created.
 *               existing_images:
 *                 type: string
 *                 description: JSON string array of gallery image paths to keep. Omit to keep old append-only behavior; send (even as "[]") to replace the gallery with exactly this set plus any newly uploaded images.
 *               image:
 *                 type: string
 *                 format: binary
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 *       422:
 *         description: Validation failed
 */
router.put(
  "/products/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  uploadAny.upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  uploadAny.compressor,
  auditMiddleware("PRODUCT"),
  productController.update.bind(productController)
);


// ================= DELETE PRODUCT =================

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 */
router.delete(
  "/products/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
    denyDelete: [UserType.SHOPKEEPER, UserType.DELIVERY_BOY],
  }),
  auditMiddleware("PRODUCT"),
  productController.delete.bind(productController)
);

/**
 * @swagger
 * /products/{id}/restore:
 *   put:
 *     summary: PUT /products/:id/restore
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.put(
  "/products/:id/restore",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("PRODUCT"),
  productController.restore.bind(productController)
);

/**
 * @swagger
 * /products/{id}/status:
 *   put:
 *     summary: PUT /products/:id/status
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.put(
  "/products/:id/status",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  auditMiddleware("PRODUCT"),
  productController.toggleStatus.bind(productController)
);

// BarCode Routes
/**
 * @swagger
 * /barcode:
 *   get:
 *     summary: Get product by barcode
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         example: "8901234567890"
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */
router.get("/barcode", productController.scan.bind(productController));

/**
 * @swagger
 * /products/{id}/approve:
 *   put:
 *     summary: PUT /products/:id/approve
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.put(
  "/products/:id/approve",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("PRODUCT_APPROVAL"),
  productController.approveProduct.bind(productController)
);

export default router;