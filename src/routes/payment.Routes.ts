import { Router } from "express";
import { paymentController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /payments/create:
 *   post:
 *     summary: Create payment (cash / online)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - amount
 *               - method
 *             properties:
 *               order_id:
 *                 type: number
 *                 example: 1
 *               amount:
 *                 type: number
 *                 example: 1000
 *               method:
 *                 type: string
 *                 example: CASH
 *     responses:
 *       200:
 *         description: Payment created successfully
 */
router.post(
  "/payments/create",
  paymentController.create.bind(paymentController)
);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get all payments
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Payments fetched successfully
 */
router.get(
  "/payments",
  paymentController.getAll.bind(paymentController)
);

export default router;