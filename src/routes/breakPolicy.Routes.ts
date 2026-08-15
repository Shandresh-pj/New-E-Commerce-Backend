import { Router } from "express";
import { BreakPolicyController } from "../controllers/break-policy.controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();
const ctrl = new BreakPolicyController();

const adminRoles = [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER];
const allRoles   = [...adminRoles, UserType.EMPLOYEE, UserType.SHOPKEEPER, UserType.DELIVERY_BOY];

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
 *                 example: "Standard Office Break Policy"
 *                 description: "**REQUIRED** Name of the policy"
 *               break_type:
 *                 type: string
 *                 enum: [LUNCH, TEA, PERSONAL, FLEXIBLE]
 *                 example: "PERSONAL"
 *                 description: Category of break
 *               max_duration_minutes:
 *                 type: integer
 *                 example: 60
 *                 description: Allowed total break duration per day in minutes
 *               max_frequency:
 *                 type: integer
 *                 example: 3
 *                 description: Maximum number of allowed breaks per day
 *               allow_split:
 *                 type: boolean
 *                 example: true
 *                 description: Whether break time can be split across multiple sessions
 *               is_paid:
 *                 type: boolean
 *                 example: false
 *                 description: Whether break time is included in paid work hours
 *               deduction_rules:
 *                 type: object
 *                 properties:
 *                   warning:
 *                     type: integer
 *                     example: 15
 *                     description: Minutes over limit before sending a warning
 *                   salary_deduction:
 *                     type: integer
 *                     example: 30
 *                     description: Minutes over limit before salary deduction applies
 *                   half_day:
 *                     type: integer
 *                     example: 60
 *                     description: Minutes over limit before marking as half day
 *                   hr_review:
 *                     type: integer
 *                     example: 120
 *                     description: Minutes over limit triggering HR review
 *     responses:
 *       201:
 *         description: Break policy created successfully
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
 *                   example: "Break policy created"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Standard Office Break Policy"
 *                     break_type:
 *                       type: string
 *                       example: "PERSONAL"
 *                     max_duration_minutes:
 *                       type: integer
 *                       example: 60
 *                     max_frequency:
 *                       type: integer
 *                       example: 3
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/break-policies", authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.create.bind(ctrl));

/**
 * @swagger
 * /break-policies/active:
 *   get:
 *     summary: Get Active Break Policy
 *     description: Gets the currently active break policy for the authenticated user's branch.
 *     tags: [BreakPolicy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active break policy retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Standard Office Break Policy"
 *                     break_type:
 *                       type: string
 *                       example: "PERSONAL"
 *                     max_duration_minutes:
 *                       type: integer
 *                       example: 60
 *                     max_frequency:
 *                       type: integer
 *                       example: 3
 *                     allow_split:
 *                       type: boolean
 *                       example: true
 *                     is_paid:
 *                       type: boolean
 *                       example: false
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/break-policies/active", authenticateMiddleware, authorize({ roles: allRoles }), ctrl.active.bind(ctrl));

/**
 * @swagger
 * /break-policies:
 *   get:
 *     summary: List Break Policies
 *     description: Retrieve all break policies configured for the company or branch.
 *     tags: [BreakPolicy]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Policies retrieved successfully
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
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Standard Office Break Policy"
 *                       break_type:
 *                         type: string
 *                         example: "PERSONAL"
 *                       max_duration_minutes:
 *                         type: integer
 *                         example: 60
 *                       max_frequency:
 *                         type: integer
 *                         example: 3
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/break-policies", authenticateMiddleware, authorize({ roles: allRoles }), ctrl.getAll.bind(ctrl));

/**
 * @swagger
 * /break-policies/{id}:
 *   get:
 *     summary: Get Break Policy Details
 *     description: Retrieve single break policy details by ID.
 *     tags: [BreakPolicy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Policy details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Standard Office Break Policy"
 *                     break_type:
 *                       type: string
 *                       example: "PERSONAL"
 *                     max_duration_minutes:
 *                       type: integer
 *                       example: 60
 *                     max_frequency:
 *                       type: integer
 *                       example: 3
 *                     is_active:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Policy not found
 *       500:
 *         description: Internal server error
 */
router.get("/break-policies/:id", authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.getOne.bind(ctrl));

/**
 * @swagger
 * /break-policies/{id}:
 *   put:
 *     summary: Update Break Policy
 *     description: Update specific break policy properties and deduction rules.
 *     tags: [BreakPolicy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Break Policy"
 *               break_type:
 *                 type: string
 *                 enum: [LUNCH, TEA, PERSONAL, FLEXIBLE]
 *                 example: "FLEXIBLE"
 *               max_duration_minutes:
 *                 type: integer
 *                 example: 45
 *               max_frequency:
 *                 type: integer
 *                 example: 2
 *               allow_split:
 *                 type: boolean
 *                 example: false
 *               is_paid:
 *                 type: boolean
 *                 example: false
 *               deduction_rules:
 *                 type: object
 *               is_active:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Break policy updated successfully
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
 *                   example: "Break policy updated"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Policy not found
 *       500:
 *         description: Internal server error
 */
router.put("/break-policies/:id", authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.update.bind(ctrl));

/**
 * @swagger
 * /break-policies/{id}:
 *   delete:
 *     summary: Delete Break Policy
 *     description: Remove a break policy by ID.
 *     tags: [BreakPolicy]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Policy deleted successfully
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
 *                   example: "Break policy deleted"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Policy not found
 *       500:
 *         description: Internal server error
 */
router.delete("/break-policies/:id", authenticateMiddleware, authorize({ roles: adminRoles }), ctrl.delete.bind(ctrl));

export default router;
