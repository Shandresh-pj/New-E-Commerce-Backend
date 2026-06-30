import { Router } from "express";
import { branchController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";

const router = Router();

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
 *     description: Create a new branch under a company
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
 *
 *               name:
 *                 type: string
 *                 example: Chennai Branch
 *
 *               location:
 *                 type: string
 *                 example: Chennai
 *
 *               email:
 *                 type: string
 *                 example: chennai@gmail.com
 *
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *
 *     responses:
 *       201:
 *         description: Branch created successfully
 *
 *       400:
 *         description: Invalid request
 *
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/branches",authenticateMiddleware,
  branchController.create.bind(
    branchController
  )
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
 *     summary: Get all branches
 *     description: Returns all branches
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Branch list fetched successfully
 */
router.get(
  "/branches",authenticateMiddleware,
  branchController.getAll.bind(
    branchController
  )
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
 *     description: Returns single branch details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Branch found
 *
 *       404:
 *         description: Branch not found
 */
router.get(
  "/branches/:id",authenticateMiddleware,
  branchController.getById.bind(
    branchController
  )
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
 *     description: Update branch details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Branch
 *
 *               location:
 *                 type: string
 *                 example: Madurai
 *
 *               email:
 *                 type: string
 *                 example: updated@gmail.com
 *
 *               phone:
 *                 type: string
 *                 example: "9999999999"
 *
 *               isActive:
 *                 type: boolean
 *                 example: true
 *
 *     responses:
 *       200:
 *         description: Branch updated successfully
 *
 *       404:
 *         description: Branch not found
 */
router.put(
  "/branches/:id",authenticateMiddleware,
  branchController.update.bind(
    branchController
  )
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
 *     description: Delete branch by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *
 *     responses:
 *       200:
 *         description: Branch deleted successfully
 *
 *       404:
 *         description: Branch not found
 */
router.delete(
  "/branches/:id",authenticateMiddleware,
  branchController.delete.bind(
    branchController
  )
);

export default router;