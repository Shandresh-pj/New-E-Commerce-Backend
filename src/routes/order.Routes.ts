import { Router } from "express";
import { alertController, orderController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /orders/create:
 *   post:
 *     summary: Create order with items, coupon, payment
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/orders/create",
  authenticateMiddleware,
  authorize(),
  auditMiddleware("ORDER"),
  orderController.create.bind(orderController)
);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/orders",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH,
      UserType.BRANCH_MANAGER, UserType.SHOPKEEPER, UserType.CUSTOMER,
      UserType.EMPLOYEE,
    ],
  }),
  orderController.getAll.bind(orderController)
);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by id
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/orders/:id",
  authenticateMiddleware,
  authorize(),
  orderController.getById.bind(orderController)
);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Delete order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/orders/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
    denyDelete: [UserType.DELIVERY_BOY, UserType.CUSTOMER],
  }),
  auditMiddleware("ORDER"),
  orderController.delete.bind(orderController)
);

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: Get all low stock alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/alerts",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  alertController.getAlerts.bind(alertController)
);

/**
 * @swagger
 * /alerts/{id}:
 *   delete:
 *     summary: Delete Low Stock Alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/alerts/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  alertController.deleteAlert.bind(alertController)
);

/**
 * @swagger
 * /orders/invoice/{id}:
 *   get:
 *     summary: Download Invoice PDF
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/orders/invoice/:id",
  authenticateMiddleware,
  authorize(),
  orderController.download.bind(orderController)
);

export default router;
