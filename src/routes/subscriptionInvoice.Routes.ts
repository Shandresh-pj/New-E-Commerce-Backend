import { Router } from "express";
import { subscriptionInvoiceController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Subscription Invoices
 *   description: Subscription Billing Invoices
 */

/**
 * @swagger
 * /subscription-invoices:
 *   get:
 *     summary: Get All Subscription Invoices
 *     tags: [Subscription Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/subscription-invoices",
  authenticateMiddleware,
  subscriptionInvoiceController.getInvoices.bind(subscriptionInvoiceController)
);

/**
 * @swagger
 * /subscription-invoices/{id}:
 *   get:
 *     summary: Get Subscription Invoice Details
 *     tags: [Subscription Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/subscription-invoices/:id",
  authenticateMiddleware,
  subscriptionInvoiceController.getInvoiceDetails.bind(subscriptionInvoiceController)
);

export default router;
