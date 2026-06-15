import { Router } from "express";
import { alertController, orderController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /orders/create:
 *   post:
 *     summary: Create order with items, coupon, payment
 *     tags: [Orders]
 */
router.post(
  "/orders/create",
  orderController.create.bind(orderController)
);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 */
router.get(
  "/orders",
  orderController.getAll.bind(orderController)
);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by id
 *     tags: [Orders]
 */
router.get(
  "/orders/:id",
  orderController.getById.bind(orderController)
);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Delete order
 *     tags: [Orders]
 */
router.delete(
  "/orders/:id",
  orderController.delete.bind(orderController)
);






/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: Get all low stock alerts
 *     tags: [Alerts]
 *     responses:
 *       200:
 *         description: Alerts fetched successfully
 */
router.get(
  "/alerts",
  alertController.getAlerts.bind(alertController)
);

/**
 * @swagger
 * /alerts/{id}:
 *   delete:
 *     summary: Delete Low Stock Alert
 *     tags: [Alerts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Alert deleted successfully
 */
router.delete(
  "/alerts/:id",
  alertController.deleteAlert.bind(alertController)
);


 /**
  * @swagger
  * /orders/invoice/{id}:
  *   get:
  *     summary: Download Invoice PDF
  *     tags: [Orders]
  *     description: Generates and downloads invoice PDF for the selected order
  *     parameters:
  *       - in: path
  *         name: id
  *         required: true
  *         schema:
  *           type: integer
  *         description: Order ID
  *     responses:
  *       200:
  *         description: Invoice PDF downloaded successfully
  *         content:
  *           application/pdf:
  *             schema:
  *               type: string
  *               format: binary
  *       404:
  *         description: Order not found
  */
router.get(
  "/orders/invoice/:id",
  orderController.download.bind(orderController)
);

export default router;