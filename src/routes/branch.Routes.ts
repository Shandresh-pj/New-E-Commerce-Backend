import { Router } from "express";
import { branchController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Branch
 *   description: Branch locations and multi-branch management
 */

/* =====================================================
   CREATE BRANCH
===================================================== */

/**
 * @swagger
 * /branches:
 *   post:
 *     tags:
 *       - Branch
 *     summary: Create Branch
 *     description: Create a new branch under a company and automatically configure default manager credentials.
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
 *               - name
 *               - location
 *               - email
 *               - phone
 *             properties:
 *               company_id:
 *                 type: integer
 *                 example: 1
 *                 description: "**REQUIRED** Parent company ID"
 *               name:
 *                 type: string
 *                 example: "Chennai Central Branch"
 *                 description: "**REQUIRED** Unique branch name"
 *               location:
 *                 type: string
 *                 example: "Anna Salai, Chennai, TN"
 *                 description: "**REQUIRED** Physical location or address"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "chennai.branch@example.com"
 *                 description: "**REQUIRED** Branch contact email"
 *               phone:
 *                 type: string
 *                 example: "+919876543210"
 *                 description: "**REQUIRED** Branch phone number"
 *               role_id:
 *                 type: integer
 *                 example: 2
 *                 description: Optional manager role ID
 *     responses:
 *       201:
 *         description: Branch created successfully
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
 *                   example: "Branch created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     name:
 *                       type: string
 *                       example: "Chennai Central Branch"
 *                     location:
 *                       type: string
 *                       example: "Anna Salai, Chennai, TN"
 *                     email:
 *                       type: string
 *                       example: "chennai.branch@example.com"
 *                     phone:
 *                       type: string
 *                       example: "+919876543210"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Company not found
 *       409:
 *         description: Branch name or email already exists
 *       500:
 *         description: Internal server error
 */
router.post(
  "/branches",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  auditMiddleware("BRANCH"),
  branchController.create.bind(branchController)
);

/* =====================================================
   GET ALL BRANCHES
===================================================== */

/**
 * @swagger
 * /branches:
 *   get:
 *     tags:
 *       - Branch
 *     summary: Get All Branches
 *     description: Retrieve all branches scoped by authenticated company.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Branch list fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 3
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
 *                         example: "Main Branch"
 *                       location:
 *                         type: string
 *                         example: "Chennai"
 *                       email:
 *                         type: string
 *                         example: "main@example.com"
 *                       phone:
 *                         type: string
 *                         example: "9876543210"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/branches",
  authenticateMiddleware,
  authorize(),
  branchController.getAll.bind(branchController)
);

/* =====================================================
   GET BRANCH BY ID
===================================================== */

/**
 * @swagger
 * /branches/{id}:
 *   get:
 *     tags:
 *       - Branch
 *     summary: Get Branch by ID
 *     description: Retrieve details for a single branch.
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
 *         description: Branch found
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
 *                       example: "Main Branch"
 *                     location:
 *                       type: string
 *                       example: "Chennai"
 *                     email:
 *                       type: string
 *                       example: "main@example.com"
 *                     phone:
 *                       type: string
 *                       example: "9876543210"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/branches/:id",
  authenticateMiddleware,
  authorize(),
  branchController.getById.bind(branchController)
);

/* =====================================================
   UPDATE BRANCH
===================================================== */

/**
 * @swagger
 * /branches/{id}:
 *   put:
 *     tags:
 *       - Branch
 *     summary: Update Branch
 *     description: Update branch details and status.
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
 *                 example: "Updated Chennai Branch"
 *               location:
 *                 type: string
 *                 example: "Madurai"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "updated@example.com"
 *               phone:
 *                 type: string
 *                 example: "9999999999"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Branch updated successfully
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
 *                   example: "Branch updated successfully"
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/branches/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  auditMiddleware("BRANCH"),
  branchController.update.bind(branchController)
);

/* =====================================================
   DELETE BRANCH
===================================================== */

/**
 * @swagger
 * /branches/{id}:
 *   delete:
 *     tags:
 *       - Branch
 *     summary: Delete Branch
 *     description: Delete or deactivate branch by ID.
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
 *         description: Branch deleted successfully
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
 *                   example: "Branch deleted successfully"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Branch not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/branches/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  auditMiddleware("BRANCH"),
  branchController.delete.bind(branchController)
);

export default router;