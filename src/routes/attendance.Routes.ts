import { Router } from "express";
import { attendanceController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /attendance/checkin:
 *   post:
 *     summary: Employee Check In
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Check in successful
 */
router.post(
  "/attendance/checkin",
  attendanceController.checkIn.bind(attendanceController)
);

/**
 * @swagger
 * /attendance/checkout:
 *   post:
 *     summary: Employee Check Out
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Check out successful
 */
router.post(
  "/attendance/checkout",
  attendanceController.checkOut.bind(attendanceController)
);

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Attendance List
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: Attendance records
 */
router.get(
  "/attendance",
  attendanceController.getAll.bind(attendanceController)
);

export default router;