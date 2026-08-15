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
 *     summary: Get Low Stock Alerts
 *     description: Retrieve list of low stock inventory alerts for branches and main warehouse.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Low stock alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Low stock alerts fetched"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       product_name:
 *                         type: string
 *                         example: "HD Set Top Box"
 *                       current_stock:
 *                         type: integer
 *                         example: 3
 *                       threshold:
 *                         type: integer
 *                         example: 10
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Requires Admin or Branch Manager role
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
 *     summary: Dismiss Low Stock Alert
 *     description: Dismiss or remove a specific inventory alert.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Alert ID to dismiss
 *     responses:
 *       200:
 *         description: Alert dismissed successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
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
 *     summary: Get User Notifications
 *     description: Retrieve all unread and read system notifications for the authenticated user.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unread, read, all]
 *           default: all
 *         description: Filter notifications by status
 *     responses:
 *       200:
 *         description: User notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       title:
 *                         type: string
 *                         example: "Order Shipped"
 *                       message:
 *                         type: string
 *                         example: "Your order ORD-9981 has been dispatched"
 *                       is_read:
 *                         type: boolean
 *                         example: false
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
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
 *     summary: Mark Notification as Read
 *     description: Mark a specific user notification as read.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_read:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
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
 *     summary: Mark All Notifications as Read
 *     description: Mark all unread notifications for the logged-in user as read.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               all:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/notifications/read-all",
  authenticateMiddleware,
  authorize(),
  alertController.markAllRead.bind(alertController)
);

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Broadcast / Create Notification
 *     description: Create and dispatch a system or module notification.
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 example: SYSTEM
 *     responses:
 *       201:
 *         description: Notification created successfully
 */
router.post(
  "/notifications",
  authenticateMiddleware,
  authorize(),
  alertController.createNotification.bind(alertController)
);

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete Notification
 *     description: Delete a specific notification by ID.
 *     tags: [Alerts]
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
 *         description: Notification deleted
 */
router.delete(
  "/notifications/:id",
  authenticateMiddleware,
  authorize(),
  alertController.deleteNotification.bind(alertController)
);

export default router;
