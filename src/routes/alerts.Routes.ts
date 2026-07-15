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

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: GET /notifications
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/notifications",
  authenticateMiddleware,
  authorize(),
  alertController.getNotifications.bind(alertController)
);

/**
 * @swagger
 * /notifications/{id}/read:
 *   put:
 *     summary: PUT /notifications/:id/read
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.put(
  "/notifications/:id/read",
  authenticateMiddleware,
  authorize(),
  alertController.markRead.bind(alertController)
);

/**
 * @swagger
 * /notifications/read-all:
 *   put:
 *     summary: PUT /notifications/read-all
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.put(
  "/notifications/read-all",
  authenticateMiddleware,
  authorize(),
  alertController.markAllRead.bind(alertController)
);

export default router;
