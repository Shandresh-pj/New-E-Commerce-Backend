import {
  productAttributeController,
  productAttributeValueController,
} from "../controllers";

const express = require("express");
const router = express.Router();

/**
 * Endpoints follow the reference contract consumed by the Angular admin UI.
 * The route loader mounts this router under /api, so the effective paths are
 * /api/ProductAttribute/All, /api/ProductAttributeValue/Add, etc.
 */

// =============================== PRODUCT ATTRIBUTE ===============================

/**
 * @swagger
 * /ProductAttribute/All:
 *   get:
 *     summary: List product attributes (paginated)
 *     tags: [ProductAttribute]
 */
router.get(
  "/ProductAttribute/All",
  productAttributeController.index.bind(productAttributeController)
);

/**
 * @swagger
 * /ProductAttribute/Detail/{Id}:
 *   get:
 *     summary: Get a product attribute by Id
 *     tags: [ProductAttribute]
 */
router.get(
  "/ProductAttribute/Detail/:Id",
  productAttributeController.detail.bind(productAttributeController)
);

/**
 * @swagger
 * /ProductAttribute/Add:
 *   post:
 *     summary: Create a product attribute
 *     tags: [ProductAttribute]
 */
router.post(
  "/ProductAttribute/Add",
  productAttributeController.create.bind(productAttributeController)
);

/**
 * @swagger
 * /ProductAttribute/Update/{Id}:
 *   post:
 *     summary: Update a product attribute
 *     tags: [ProductAttribute]
 */
router.post(
  "/ProductAttribute/Update/:Id",
  productAttributeController.update.bind(productAttributeController)
);

/**
 * @swagger
 * /ProductAttribute/{Id}:
 *   delete:
 *     summary: Delete a product attribute
 *     tags: [ProductAttribute]
 */
router.delete(
  "/ProductAttribute/:Id",
  productAttributeController.deleteItem.bind(productAttributeController)
);

// ============================ PRODUCT ATTRIBUTE VALUE ============================

/**
 * @swagger
 * /ProductAttributeValue/All:
 *   get:
 *     summary: List product attribute values (paginated, optional ProductAttributeId filter)
 *     tags: [ProductAttributeValue]
 */
router.get(
  "/ProductAttributeValue/All",
  productAttributeValueController.index.bind(productAttributeValueController)
);

/**
 * @swagger
 * /ProductAttributeValue/Detail/{Id}:
 *   get:
 *     summary: Get a product attribute value by Id
 *     tags: [ProductAttributeValue]
 */
router.get(
  "/ProductAttributeValue/Detail/:Id",
  productAttributeValueController.detail.bind(productAttributeValueController)
);

/**
 * @swagger
 * /ProductAttributeValue/Add:
 *   post:
 *     summary: Create a product attribute value
 *     tags: [ProductAttributeValue]
 */
router.post(
  "/ProductAttributeValue/Add",
  productAttributeValueController.create.bind(productAttributeValueController)
);

/**
 * @swagger
 * /ProductAttributeValue/Update/{Id}:
 *   post:
 *     summary: Update a product attribute value
 *     tags: [ProductAttributeValue]
 */
router.post(
  "/ProductAttributeValue/Update/:Id",
  productAttributeValueController.update.bind(productAttributeValueController)
);

/**
 * @swagger
 * /ProductAttributeValue/{Id}:
 *   delete:
 *     summary: Delete a product attribute value
 *     tags: [ProductAttributeValue]
 */
router.delete(
  "/ProductAttributeValue/:Id",
  productAttributeValueController.deleteItem.bind(productAttributeValueController)
);

module.exports = router;
