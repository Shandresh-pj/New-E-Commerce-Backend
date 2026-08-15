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
 *     summary: Get All Products (Paginated & Filterable)
 *     description: Retrieve list of active and inactive products with category, type, and keyword search filters.
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (Optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page (Optional)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter by status (Optional)
 *       - in: query
 *         name: product_type
 *         schema:
 *           type: string
 *           enum: [simple, variant]
 *         description: Filter by product structure (Optional)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Category ID or slug filter (Optional)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by product name or SKU (Optional)
 *     responses:
 *       200:
 *         description: Paginated product list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get(
  "/products",
  productController.getAll.bind(productController)
);

/**
 * @swagger
 * /products/export:
 *   get:
 *     summary: Export Products Data
 *     description: Download CSV/Excel export of full product catalog.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product catalog CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               example: "id,name,sku,price,stock\n1,Sample Product,SKU-001,499.00,50"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/products/export",
  productController.exportProducts.bind(productController)
);

/**
 * @swagger
 * /products/import:
 *   post:
 *     summary: Bulk Import Products
 *     description: Upload CSV spreadsheet to create or update bulk product records.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV spreadsheet file containing product rows (Required)
 *     responses:
 *       200:
 *         description: Products imported successfully
 *       400:
 *         description: Invalid file format or data row errors
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
 *     summary: Get Product Details By ID
 *     description: Fetch complete product attributes, stock levels, variants, and media URLs.
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID or Slug (Required)
 *     responses:
 *       200:
 *         description: Product details retrieved
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
 *     summary: Create New Product
 *     description: Add a new simple or variant product with image attachments and inventory settings.
 *     tags: [Products]
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
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *                 example: "HD Set Top Box"
 *                 description: Product title (Required)
 *               description:
 *                 type: string
 *                 example: "DTH satellite receiver box with remote control"
 *                 description: Full item description (Optional)
 *               price:
 *                 type: number
 *                 example: 1499.00
 *                 description: Base price (Required)
 *               sale_price:
 *                 type: number
 *                 example: 1299.00
 *                 description: Discounted price (Optional)
 *               stock:
 *                 type: number
 *                 example: 50
 *                 description: Available stock count (Required)
 *               category:
 *                 type: string
 *                 example: "cat_10"
 *                 description: Category ID (Optional)
 *               barcode:
 *                 type: string
 *                 example: "8901234567890"
 *                 description: Barcode identifier (Optional)
 *               product_type:
 *                 type: string
 *                 enum: [simple, variant]
 *                 default: simple
 *                 description: Product structural type (Optional)
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *                 description: Visibility status (Optional)
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Primary product thumbnail image (Optional)
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Additional gallery images (Optional)
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Missing required fields or validation error
 */
router.post(
  "/products/add",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN,
      UserType.ADMIN,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
      UserType.BRANCH,
      UserType.EMPLOYEE,
      UserType.DELIVERY_BOY,
    ],
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

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update Product
 *     description: Update an existing product details, price, inventory stock, or gallery images.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID (Required)
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated HD Set Top Box"
 *               price:
 *                 type: number
 *                 example: 1399.00
 *               stock:
 *                 type: number
 *                 example: 60
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         description: Product not found
 */
router.put(
  "/products/:id",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN,
      UserType.ADMIN,
      UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER,
      UserType.BRANCH,
      UserType.EMPLOYEE,
      UserType.DELIVERY_BOY,
    ],
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

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete Product (Soft Delete)
 *     description: Remove or archive a product from catalog by ID.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID (Required)
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
 *     summary: Restore Soft-Deleted Product
 *     description: Restore a previously deleted product back into active catalog.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID (Required)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Restored by catalog manager"
 *     responses:
 *       200:
 *         description: Product restored successfully
 *       404:
 *         description: Product not found
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
 *     summary: Toggle Product Active Status
 *     description: Toggle product state between active and inactive.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID (Required)
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
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: active
 *                 description: Target status (Required)
 *     responses:
 *       200:
 *         description: Status updated
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
 *     summary: Scan Barcode
 *     description: Look up product details instantly by barcode string.
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: barcode
 *         required: true
 *         schema:
 *           type: string
 *         example: "8901234567890"
 *         description: Product Barcode Number (Required)
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 10
 *                     name:
 *                       type: string
 *                       example: "Wireless Optical Mouse"
 *                     sku:
 *                       type: string
 *                       example: "MOU-OPT-001"
 *                     barcode:
 *                       type: string
 *                       example: "8901234567890"
 *                     retail_price:
 *                       type: number
 *                       example: 499.00
 *                     stock_quantity:
 *                       type: integer
 *                       example: 30
 *       404:
 *         description: Product not found
 */
router.get("/barcode", productController.scan.bind(productController));

/**
 * @swagger
 * /products/{id}/approve:
 *   put:
 *     summary: Approve Pending Product Listing
 *     description: Approve candidate product listing submitted by branch manager or vendor.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID (Required)
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *                 example: "Approved by manager"
 *     responses:
 *       200:
 *         description: Product listing approved
 *       404:
 *         description: Product not found
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