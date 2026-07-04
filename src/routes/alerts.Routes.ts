import { Router } from "express";
import { alertController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /alerts:
 *   get:
 *     summary: Get low stock alerts
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/alerts",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  alertController.getAlerts.bind(alertController)
);

/**
 * @swagger
 * /alerts/{id}:
 *   delete:
 *     summary: Dismiss/Delete alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/alerts/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  alertController.deleteAlert.bind(alertController)
);

export default router;
