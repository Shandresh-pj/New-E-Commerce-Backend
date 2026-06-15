import { Router } from "express";
import { paymentController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /payments/create:
 *   post:
 *     summary: Create Payment
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               order_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               method:
 *                 type: string
 *                 example: CASH
 *               status:
 *                 type: string
 *                 example: SUCCESS
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
 *     summary: Get All Payments
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: Payment list fetched successfully
 */
router.get(
  "/payments",
  paymentController.getAll.bind(paymentController)
);

export default router;