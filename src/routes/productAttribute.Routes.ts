import { Router } from "express";
import { ProductAttributeController, ProductAttributeValueController } from "../controllers/productAttribute.Controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();
const attributeController = new ProductAttributeController();
const attributeValueController = new ProductAttributeValueController();

/**
 * @swagger
 * tags:
 *   name: ProductAttributes
 *   description: Manage configurable product attributes and their discrete values
 */

// ── Attributes CRUD ──────────────────────────────────────────
router.get("/product-attributes", authenticateMiddleware, (req, res, next) => attributeController.index(req, res, next));
router.post("/product-attributes", authenticateMiddleware, (req, res, next) => attributeController.create(req, res, next));
router.get("/product-attributes/:Id", authenticateMiddleware, (req, res, next) => attributeController.detail(req, res, next));
router.put("/product-attributes/:Id", authenticateMiddleware, (req, res, next) => attributeController.update(req, res, next));
router.delete("/product-attributes/:Id", authenticateMiddleware, (req, res, next) => attributeController.deleteItem(req, res, next));

// ── Attribute Values CRUD ────────────────────────────────────
router.get("/product-attribute-values", authenticateMiddleware, (req, res, next) => attributeValueController.index(req, res, next));
router.post("/product-attribute-values", authenticateMiddleware, (req, res, next) => attributeValueController.create(req, res, next));
router.get("/product-attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.detail(req, res, next));
router.put("/product-attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.update(req, res, next));
router.delete("/product-attribute-values/:Id", authenticateMiddleware, (req, res, next) => attributeValueController.deleteItem(req, res, next));

export default router;
