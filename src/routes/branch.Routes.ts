import { Router } from "express";
import { branchController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate";

const router = Router();

/* =========================================================
   CREATE BRANCH
========================================================= */
/**
 * @swagger
 * /branch/create:
 *   post:
 *     tags:
 *       - Branch
 *     summary: Create Branch
 *     description: Create a new branch under a company
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
 *             properties:
 *               company_id:
 *                 type: number
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: Main Branch
 *               location:
 *                 type: string
 *                 example: Madurai
 */
router.post("/branch/create", authenticateMiddleware, branchController.create.bind(branchController));

/* =========================================================
   GET ALL BRANCHES
========================================================= */
/**
 * @swagger
 * /branch/all:
 *   get:
 *     tags:
 *       - Branch
 *     summary: Get all branches
 *     description: Get all branches by company_id
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: number
 *           example: 1
 */
router.get("/branch/all", branchController.getAll.bind(branchController));

// /* =========================================================
//    GET BRANCH BY ID
// ========================================================= */
// /**
//  * @swagger
//  * /branch/{id}:
//  *   get:
//  *     tags:
//  *       - Branch
//  *     summary: Get branch by ID
//  *     description: Get single branch details
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: number
//  *           example: 1
//  */
// router.get("/branch/:id", branchController.getById.bind(branchController));

// /* =========================================================
//    UPDATE BRANCH
// ========================================================= */
// /**
//  * @swagger
//  * /branch/update:
//  *   put:
//  *     tags:
//  *       - Branch
//  *     summary: Update branch
//  *     description: Update branch details
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - id
//  *             properties:
//  *               id:
//  *                 type: number
//  *                 example: 1
//  *               name:
//  *                 type: string
//  *                 example: Updated Branch Name
//  *               location:
//  *                 type: string
//  *                 example: Chennai
//  */
// router.put("/branch/update", branchController.update.bind(branchController));

// /* =========================================================
//    DELETE BRANCH
// ========================================================= */
// /**
//  * @swagger
//  * /branch/delete:
//  *   delete:
//  *     tags:
//  *       - Branch
//  *     summary: Delete branch
//  *     description: Delete branch by ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - id
//  *             properties:
//  *               id:
//  *                 type: number
//  *                 example: 1
//  */
// router.delete("/branch/delete", branchController.delete.bind(branchController));

export default router;