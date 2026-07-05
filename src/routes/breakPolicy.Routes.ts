import { Router } from "express";
import { BreakPolicyController } from "../controllers/break-policy.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();
const ctrl = new BreakPolicyController();

const adminRoles = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER];

/**
 * @swagger
 * tags:
 *   name: BreakPolicy
 *   description: Break policy configurations and limits API
 */

/**
 * @swagger
 * /break-policies:
 *   post:
 *     summary: Create Break Policy
 *     description: Creates a new break policy with custom deduction thresholds. (Admin only)
 *     tags: [BreakPolicy]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               break_type:
 *                 type: string
 *                 enum: [LUNCH, TEA, PERSONAL, FLEXIBLE]
 *               max_duration_minutes:
 *                 type: integer
 *               max_frequency:
 *                 type: integer
 *               allow_split:
 *                 type: boolean
 *               is_paid:
 *                 type: boolean
 *               deduction_rules:
 *                 type: object
 *                 properties:
 *                   warning:
 *                     type: integer
 *                   salary_deduction:
 *                     type: integer
 *                   half_day:
 *                     type: integer
 *                   hr_review:
 *                     type: integer
 *     responses:
 *       201:
 *         description: Break policy created successfully
 */
router.post("/break-policies",           authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.create.bind(ctrl));

/**
 * @swagger
 * /break-policies/active:
 *   get:
 *     summary: Get Active Break Policy
 *     description: Gets the active break policy for the scoped branch.
 *     tags: [BreakPolicy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active break policy retrieved
 */
router.get("/break-policies/active",     authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.active.bind(ctrl));

/**
 * @swagger
 * /break-policies:
 *   get:
 *     summary: List Break Policies
 *     description: Retrieve all break policies for the company/branch.
 *     tags: [BreakPolicy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Policies retrieved successfully
 */
router.get("/break-policies",            authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.getAll.bind(ctrl));

/**
 * @swagger
 * /break-policies/{id}:
 *   get:
 *     summary: Get Break Policy Details
 *     description: Retrieve single break policy details.
 *     tags: [BreakPolicy]
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
 *         description: Policy details retrieved
 */
router.get("/break-policies/:id",        authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.getOne.bind(ctrl));

/**
 * @swagger
 * /break-policies/{id}:
 *   put:
 *     summary: Update Break Policy
 *     description: Update specific break policy properties and rules.
 *     tags: [BreakPolicy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               break_type:
 *                 type: string
 *               max_duration_minutes:
 *                 type: integer
 *               max_frequency:
 *                 type: integer
 *               allow_split:
 *                 type: boolean
 *               is_paid:
 *                 type: boolean
 *               deduction_rules:
 *                 type: object
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Break policy updated
 */
router.put("/break-policies/:id",        authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.update.bind(ctrl));

/**
 * @swagger
 * /break-policies/{id}:
 *   delete:
 *     summary: Delete Break Policy
 *     description: Remove a break policy.
 *     tags: [BreakPolicy]
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
 *         description: Policy deleted
 */
router.delete("/break-policies/:id",     authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.delete.bind(ctrl));

export default router;
