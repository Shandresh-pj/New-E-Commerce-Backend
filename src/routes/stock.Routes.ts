import { Router } from "express";
import { stockController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /stock/update:
 *   post:
 *     summary: Update Product Stock
 *     tags: [Stock]
 *     description: Add or Remove stock from product inventory
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_id:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *               action:
 *                 type: string
 *                 example: ADD
 *     responses:
 *       200:
 *         description: Stock updated successfully
 */
router.post(
  "/stock/update",
  stockController.updateStock.bind(stockController)
);

/**
 * @swagger
 * /stock/logs:
 *   get:
 *     summary: Get all stock logs
 *     tags: [Stock]
 *     responses:
 *       200:
 *         description: Stock logs fetched successfully
 */
router.get(
  "/stock/logs",
  stockController.logs.bind(stockController)
);


export default router;