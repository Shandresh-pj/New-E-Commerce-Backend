import { Router } from "express";
import { ProfitLossController } from "../controllers/profitLoss.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Profit & Loss
 *   description: Profit & Loss accounting and reporting
 */

/**
 * @swagger
 * /profit-loss:
 *   post:
 *     summary: Create manual P&L record
 *     tags: [Profit & Loss]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_id
 *               - record_date
 *               - revenue
 *               - expenses
 *             properties:
 *               company_id:
 *                 type: integer
 *               branch_id:
 *                 type: integer
 *               record_date:
 *                 type: string
 *                 format: date
 *               revenue:
 *                 type: number
 *               expenses:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  "/profit-loss",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  ProfitLossController.create
);

/**
 * @swagger
 * /profit-loss:
 *   get:
 *     summary: Get all P&L records
 *     tags: [Profit & Loss]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company_id
 *         schema:
 *           type: integer
 *         required: false
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/profit-loss",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  ProfitLossController.getAll
);

/**
 * @swagger
 * /profit-loss/{id}:
 *   delete:
 *     summary: Delete P&L record
 *     tags: [Profit & Loss]
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
 *         description: Deleted
 */
router.delete(
  "/profit-loss/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  ProfitLossController.delete
);

/**
 * @swagger
 * /profit-loss/auto-calculate:
 *   post:
 *     summary: Auto calculate and save P&L record based on delivered orders and salaries
 *     tags: [Profit & Loss]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_id
 *               - start_date
 *               - end_date
 *             properties:
 *               company_id:
 *                 type: integer
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Auto-calculated successfully
 */
router.post(
  "/profit-loss/auto-calculate",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  ProfitLossController.autoCalculate
);

export default router;
