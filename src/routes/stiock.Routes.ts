import { Router } from "express";
import { stockController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /stock/update:
 *   post:
 *     summary: Update product stock (ADD / REMOVE)
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *               - quantity
 *               - action
 *             properties:
 *               product_id:
 *                 type: number
 *                 example: 1
 *               quantity:
 *                 type: number
 *                 example: 5
 *               action:
 *                 type: string
 *                 enum: [ADD, REMOVE]
 *                 example: ADD
 *     responses:
 *       200:
 *         description: Stock updated successfully
 *       400:
 *         description: Insufficient stock
 *       404:
 *         description: Product not found
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