import { orderController, productController } from "../controllers";
import { uploadAny } from "../utils/upload";

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
  uploadAny.upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  uploadAny.compressor,
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
  uploadAny.upload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 },
    { name: "video", maxCount: 1 },
  ]),
  uploadAny.compressor,
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
  productController.delete.bind(productController)
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

module.exports = router;