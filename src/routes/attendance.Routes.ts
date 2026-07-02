import { Router } from "express";
import { attendanceController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /attendance/checkin:
 *   post:
 *     summary: Employee Check In
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/attendance/checkin",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER, UserType.DELIVERY_BOY, UserType.EMPLOYEE,
    ],
  }),
  attendanceController.checkIn.bind(attendanceController)
);

/**
 * @swagger
 * /attendance/checkout:
 *   post:
 *     summary: Employee Check Out
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/attendance/checkout",
  authenticateMiddleware,
  authorize({
    roles: [
      UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER,
      UserType.SHOPKEEPER, UserType.DELIVERY_BOY, UserType.EMPLOYEE,
    ],
  }),
  attendanceController.checkOut.bind(attendanceController)
);

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Attendance List
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/attendance",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  attendanceController.getAll.bind(attendanceController)
);

export default router;
