import { Router } from "express";
import { paymentController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /payments/create:
 *   post:
 *     summary: Create Payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/payments/create",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  auditMiddleware("PAYMENT"),
  paymentController.create.bind(paymentController)
);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get All Payments
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/payments",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  paymentController.getAll.bind(paymentController)
);

export default router;
