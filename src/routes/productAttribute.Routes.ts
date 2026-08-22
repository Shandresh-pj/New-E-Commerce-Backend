import { Router } from "express";
import { ProductAttributeController, ProductAttributeValueController } from "../controllers/productAttribute.Controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();
const attributeController = new ProductAttributeController();
const attributeValueController = new ProductAttributeValueController();

/**
 * @swagger
 * tags:
 *   - name: ProductAttributes
 *     description: Manage configurable product attributes (e.g. Color, Size, Material)
 *   - name: ProductAttributeValues
 *     description: Manage discrete attribute values and product links (e.g. Red, Blue, XL, Cotton)
 */

// ══════════════════════════════════════════════════════════════════════════
// 1. PRODUCT ATTRIBUTES CRUD (/product-attributes)
// ══════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /product-attributes:
 *   get:
 *     tags: [ProductAttributes]
 *     summary: List All Product Attributes
 *     description: Retrieve paginated list of product attributes with optional search and sorting.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword matching attribute name
 *         example: "Color"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [Id, AttributeNameCode, Name, CreatedAt]
 *           default: Id
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: List of product attributes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attributes fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       example: 5
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 1
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           Id:
 *                             type: integer
 *                             example: 1
 *                           CompanyId:
 *                             type: integer
 *                             example: 1
 *                           AttributeNameCode:
 *                             type: string
 *                             example: "color"
 *                           Name:
 *                             type: string
 *                             example: "Color"
 *                           CreatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-08-15T10:00:00.000Z"
 *                           UpdatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-08-15T10:00:00.000Z"
 *                           ProductAttributeTranslations:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 LanguagesId:
 *                                   type: integer
 *                                   nullable: true
 *                                   example: null
 *                                 Name:
 *                                   type: string
 *                                   example: "Color"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/product-attributes", authenticateMiddleware, (req, res, next) => attributeController.index(req, res, next));

/**
 * @swagger
 * /product-attributes:
 *   post:
 *     tags: [ProductAttributes]
 *     summary: Create New Product Attribute
 *     description: Register a new configurable product attribute with unique code and name.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Name
 *             properties:
 *               Name:
 *                 type: string
 *                 example: "Color"
 *                 description: "**REQUIRED** Display name of the product attribute"
 *               AttributeNameCode:
 *                 type: string
 *                 example: "color"
 *                 description: Unique identifier code (auto-generated from Name if omitted)
 *               CompanyId:
 *                 type: integer
 *                 example: 1
 *                 description: Associated company ID
 *               ProductAttributeTranslations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     LanguagesId:
 *                       type: integer
 *                       example: 1
 *                     Name:
 *                       type: string
 *                       example: "Color"
 *     responses:
 *       200:
 *         description: Product attribute added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute added successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Attribute code or name missing or already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/product-attributes", authenticateMiddleware, (req, res, next) => attributeController.create(req, res, next));

/**
 * @swagger
 * /product-attributes/{Id}:
 *   get:
 *     tags: [ProductAttributes]
 *     summary: Get Product Attribute Details
 *     description: Retrieve details of a specific product attribute by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product attribute ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Product attribute details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: integer
 *                       example: 1
 *                     CompanyId:
 *                       type: integer
 *                       example: 1
 *                     AttributeNameCode:
 *                       type: string
 *                       example: "color"
 *                     Name:
 *                       type: string
 *                       example: "Color"
 *                     CreatedAt:
 *                       type: string
 *                       format: date-time
 *                     UpdatedAt:
 *                       type: string
 *                       format: date-time
 *                     ProductAttributeTranslations:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product attribute not found
 *       500:
 *         description: Internal server error
 */
router.get("/product-attributes/:Id", authenticateMiddleware, (req, res, next) => attributeController.detail(req, res, next));

/**
 * @swagger
 * /product-attributes/{Id}:
 *   put:
 *     tags: [ProductAttributes]
 *     summary: Update Product Attribute
 *     description: Modify name or code of an existing product attribute.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product attribute ID to update
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Name:
 *                 type: string
 *                 example: "Primary Color"
 *               AttributeNameCode:
 *                 type: string
 *                 example: "primary_color"
 *               ProductAttributeTranslations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     LanguagesId:
 *                       type: integer
 *                     Name:
 *                       type: string
 *     responses:
 *       200:
 *         description: Product attribute updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Duplicate attribute code or name
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product attribute not found
 *       500:
 *         description: Internal server error
 */
router.put("/product-attributes/:Id", authenticateMiddleware, (req, res, next) => attributeController.update(req, res, next));
router.post("/product-attributes/:Id", authenticateMiddleware, (req, res, next) => attributeController.update(req, res, next));
router.patch("/product-attributes/:Id", authenticateMiddleware, (req, res, next) => attributeController.update(req, res, next));

/**
 * @swagger
 * /product-attributes/{Id}:
 *   delete:
 *     tags: [ProductAttributes]
 *     summary: Delete Product Attribute
 *     description: Remove a product attribute and cascade delete its discrete values (blocked if active product variants reference it).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product attribute ID to delete
 *         example: 1
 *     responses:
 *       200:
 *         description: Product attribute deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute and associated values deleted successfully"
 *       400:
 *         description: Cannot delete attribute in use by product variants
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete("/product-attributes/:Id", authenticateMiddleware, (req, res, next) => attributeController.deleteItem(req, res, next));

// ══════════════════════════════════════════════════════════════════════════
// 2. PRODUCT ATTRIBUTE VALUES CRUD (/product-attribute-values)
// ══════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /product-attribute-values:
 *   get:
 *     tags: [ProductAttributeValues]
 *     summary: List Product Attribute Values
 *     description: Retrieve paginated list of attribute values with optional filtering by parent attribute ID and search.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ProductAttributeId
 *         schema:
 *           type: integer
 *         description: Filter values by parent Product Attribute ID (or "ALL")
 *         example: 1
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search keyword matching value name
 *         example: "Red"
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [Id, AttributeValueCode, Name, CreatedAt]
 *           default: Id
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: List of product attribute values retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute values fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       example: 12
 *                     currentPage:
 *                       type: integer
 *                       example: 1
 *                     pageSize:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 2
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           Id:
 *                             type: integer
 *                             example: 1
 *                           CompanyId:
 *                             type: integer
 *                             example: 1
 *                           ProductAttributeId:
 *                             type: integer
 *                             example: 1
 *                           AttributeValueCode:
 *                             type: string
 *                             example: "red"
 *                           Name:
 *                             type: string
 *                             example: "Red"
 *                           attribute_name:
 *                             type: string
 *                             example: "Color"
 *                           product_ids:
 *                             type: array
 *                             items:
 *                               type: integer
 *                             example: [101, 102]
 *                           ProductAttributeValueTranslations:
 *                             type: array
 *                             items:
 *                               type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/product-attribute-values", authenticateMiddleware, (req, res, next) => attributeValueController.index(req, res, next));

/**
 * @swagger
 * /product-attribute-values:
 *   post:
 *     tags: [ProductAttributeValues]
 *     summary: Create New Product Attribute Value
 *     description: Register a new discrete value under a product attribute with optional product associations.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ProductAttributeId
 *               - Name
 *             properties:
 *               ProductAttributeId:
 *                 type: integer
 *                 example: 1
 *                 description: "**REQUIRED** Parent Product Attribute ID"
 *               Name:
 *                 type: string
 *                 example: "Red"
 *                 description: "**REQUIRED** Display name of the attribute value"
 *               AttributeValueCode:
 *                 type: string
 *                 example: "red"
 *                 description: Value code identifier or color hex code (e.g. #FF0000)
 *               CompanyId:
 *                 type: integer
 *                 example: 1
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [101, 102]
 *                 description: Product IDs linked to this attribute value
 *               ProductAttributeValueTranslations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     LanguagesId:
 *                       type: integer
 *                     Name:
 *                       type: string
 *     responses:
 *       200:
 *         description: Product attribute value added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute value added successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Missing required fields or duplicate code/name
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Parent product attribute not found
 *       500:
 *         description: Internal server error
 */
router.post("/product-attribute-values", authenticateMiddleware, (req, res, next) => attributeValueController.create(req, res, next));

/**
 * @swagger
 * /product-attribute-values/{Id}:
 *   get:
 *     tags: [ProductAttributeValues]
 *     summary: Get Product Attribute Value Details
 *     description: Retrieve details of a specific attribute value and its associated product links.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product attribute value ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Product attribute value details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute value fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: integer
 *                       example: 1
 *                     ProductAttributeId:
 *                       type: integer
 *                       example: 1
 *                     AttributeValueCode:
 *                       type: string
 *                       example: "red"
 *                     Name:
 *                       type: string
 *                       example: "Red"
 *                     attribute_name:
 *                       type: string
 *                       example: "Color"
 *                     product_ids:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [101, 102]
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product attribute value not found
 *       500:
 *         description: Internal server error
 */
router.get("/product-attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.detail(req, res, next));

/**
 * @swagger
 * /product-attribute-values/{Id}:
 *   put:
 *     tags: [ProductAttributeValues]
 *     summary: Update Product Attribute Value
 *     description: Modify name, code, parent attribute, or linked product IDs of an attribute value.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product attribute value ID to update
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ProductAttributeId:
 *                 type: integer
 *                 example: 1
 *               Name:
 *                 type: string
 *                 example: "Crimson Red"
 *               AttributeValueCode:
 *                 type: string
 *                 example: "crimson_red"
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [101, 102, 105]
 *               ProductAttributeValueTranslations:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     LanguagesId:
 *                       type: integer
 *                     Name:
 *                       type: string
 *     responses:
 *       200:
 *         description: Product attribute value updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute value updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Duplicate attribute value code or name
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product attribute value not found
 *       500:
 *         description: Internal server error
 */
router.put("/product-attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));
router.post("/product-attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));
router.patch("/product-attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));

/**
 * @swagger
 * /product-attribute-values/{Id}:
 *   delete:
 *     tags: [ProductAttributeValues]
 *     summary: Delete Product Attribute Value
 *     description: Remove a product attribute value and its product associations (blocked if product variants are using it).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product attribute value ID to delete
 *         example: 1
 *     responses:
 *       200:
 *         description: Product attribute value deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute value deleted successfully"
 *       400:
 *         description: Cannot delete value in use by product variants
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete("/product-attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.deleteItem(req, res, next));

// ══════════════════════════════════════════════════════════════════════════
// 3. ATTRIBUTE VALUES ALIAS CRUD (/attribute-values)
// ══════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /attribute-values:
 *   get:
 *     tags: [ProductAttributeValues]
 *     summary: List Attribute Values (Alias Route)
 *     description: Retrieve paginated list of attribute values with optional filtering by parent attribute ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: attribute_id
 *         schema:
 *           type: integer
 *         description: Filter values by parent attribute ID
 *         example: 1
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         example: "XL"
 *     responses:
 *       200:
 *         description: List of attribute values retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute values fetched successfully"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/attribute-values", authenticateMiddleware, (req, res, next) => attributeValueController.index(req, res, next));

/**
 * @swagger
 * /attribute-values:
 *   post:
 *     tags: [ProductAttributeValues]
 *     summary: Create Attribute Value (Alias Route)
 *     description: Register a new attribute value under a product attribute.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - attribute_id
 *               - name
 *             properties:
 *               attribute_id:
 *                 type: integer
 *                 example: 2
 *                 description: "**REQUIRED** Parent Product Attribute ID"
 *               name:
 *                 type: string
 *                 example: "XL"
 *                 description: "**REQUIRED** Display name"
 *               code:
 *                 type: string
 *                 example: "size_xl"
 *                 description: Value code identifier
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [101]
 *     responses:
 *       200:
 *         description: Attribute value added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute value added successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: integer
 *                       example: 2
 *       400:
 *         description: Missing required fields or duplicate code/name
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/attribute-values", authenticateMiddleware, (req, res, next) => attributeValueController.create(req, res, next));

/**
 * @swagger
 * /attribute-values/{Id}:
 *   get:
 *     tags: [ProductAttributeValues]
 *     summary: Get Attribute Value Details (Alias Route)
 *     description: Retrieve details of a specific attribute value by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attribute value ID
 *         example: 2
 *     responses:
 *       200:
 *         description: Attribute value details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute value fetched successfully"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Attribute value not found
 *       500:
 *         description: Internal server error
 */
router.get("/attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.detail(req, res, next));

/**
 * @swagger
 * /attribute-values/{Id}:
 *   put:
 *     tags: [ProductAttributeValues]
 *     summary: Update Attribute Value (Alias Route)
 *     description: Modify name, code, parent attribute, or linked product IDs of an attribute value.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attribute value ID to update
 *         example: 2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attribute_id:
 *                 type: integer
 *                 example: 2
 *               name:
 *                 type: string
 *                 example: "Extra Large (XL)"
 *               code:
 *                 type: string
 *                 example: "size_xl_extra"
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [101, 103]
 *     responses:
 *       200:
 *         description: Attribute value updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute value updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     Id:
 *                       type: integer
 *                       example: 2
 *       400:
 *         description: Duplicate code or name
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Attribute value not found
 *       500:
 *         description: Internal server error
 */
router.put("/attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));

/**
 * @swagger
 * /attribute-values/{Id}:
 *   delete:
 *     tags: [ProductAttributeValues]
 *     summary: Delete Attribute Value (Alias Route)
 *     description: Remove an attribute value by ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: Id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Attribute value ID to delete
 *         example: 2
 *     responses:
 *       200:
 *         description: Attribute value deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Product attribute value deleted successfully"
 *       400:
 *         description: Cannot delete value in use by product variants
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.delete("/attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.deleteItem(req, res, next));

// ══════════════════════════════════════════════════════════════════════════
// 4. ADDITIONAL SINGULAR & PLURAL ALIAS ROUTE MAPPINGS
// ══════════════════════════════════════════════════════════════════════════

// Singular /product-attribute mappings
router.get("/product-attribute", authenticateMiddleware, (req, res, next) => attributeController.index(req, res, next));
router.post("/product-attribute", authenticateMiddleware, (req, res, next) => attributeController.create(req, res, next));
router.get("/product-attribute/:Id", authenticateMiddleware, (req, res, next) => attributeController.detail(req, res, next));
router.put("/product-attribute/:Id", authenticateMiddleware, (req, res, next) => attributeController.update(req, res, next));
router.post("/product-attribute/:Id", authenticateMiddleware, (req, res, next) => attributeController.update(req, res, next));
router.patch("/product-attribute/:Id", authenticateMiddleware, (req, res, next) => attributeController.update(req, res, next));
router.delete("/product-attribute/:Id", authenticateMiddleware, (req, res, next) => attributeController.deleteItem(req, res, next));

// Singular /product-attribute-value mappings
router.get("/product-attribute-value", authenticateMiddleware, (req, res, next) => attributeValueController.index(req, res, next));
router.post("/product-attribute-value", authenticateMiddleware, (req, res, next) => attributeValueController.create(req, res, next));
router.get("/product-attribute-value/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.detail(req, res, next));
router.put("/product-attribute-value/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));
router.post("/product-attribute-value/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));
router.patch("/product-attribute-value/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));
router.delete("/product-attribute-value/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.deleteItem(req, res, next));

// Singular /attribute-value mappings
router.get("/attribute-value", authenticateMiddleware, (req, res, next) => attributeValueController.index(req, res, next));
router.post("/attribute-value", authenticateMiddleware, (req, res, next) => attributeValueController.create(req, res, next));
router.get("/attribute-value/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.detail(req, res, next));
router.put("/attribute-value/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));
router.post("/attribute-value/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));
router.patch("/attribute-value/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));
router.delete("/attribute-value/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.deleteItem(req, res, next));

export default router;

