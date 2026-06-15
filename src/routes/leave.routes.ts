import { Router } from "express";
import { leaveController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /leave/apply:
 *   post:
 *     summary: Apply Leave
 *     tags: [Leave]
 *     responses:
 *       200:
 *         description: Leave applied
 */
router.post(
  "/leave/apply",
  leaveController.apply.bind(leaveController)
);

/**
 * @swagger
 * /leave:
 *   get:
 *     summary: Get Leave Requests
 *     tags: [Leave]
 *     responses:
 *       200:
 *         description: Leave list
 */
router.get(
  "/leave",
  leaveController.getAll.bind(leaveController)
);

/**
 * @swagger
 * /leave/approve/{id}:
 *   put:
 *     summary: Approve Leave
 *     tags: [Leave]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Leave approved
 */
router.put(
  "/leave/approve/:id",
  leaveController.approve.bind(leaveController)
);

export default router;