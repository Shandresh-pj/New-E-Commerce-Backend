import { Router } from "express";
import { employeeController } from "../controllers";
const router = Router();

/* =========================================================
   GET ALL EMPLOYEES
========================================================= */
/**
 * @swagger
 * /employees:
 *   get:
 *     tags:
 *       - Employees
 *     summary: Get all employees
 *     description: Get employees filtered by company_id (query param)
 *     parameters:
 *       - in: query
 *         name: company_id
 *         required: true
 *         schema:
 *           type: number
 *           example: 1
 */
router.get(
  "/employees",
  employeeController.getAll.bind(employeeController)
);

/* =========================================================
   GET EMPLOYEE BY ID
========================================================= */
/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     tags:
 *       - Employees
 *     summary: Get employee by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *           example: 1
 */
router.get(
  "/employees/:id",
  employeeController.getOne.bind(employeeController)
);

/* =========================================================
   CREATE EMPLOYEE
========================================================= */
/**
 * @swagger
 * /employees/create:
 *   post:
 *     tags:
 *       - Employees
 *     summary: Create employee
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - company_id
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@gmail.com
 *               company_id:
 *                 type: number
 *                 example: 1
 */
router.post(
  "/employees/create",
  employeeController.create.bind(employeeController)
);

/* =========================================================
   UPDATE EMPLOYEE
========================================================= */
/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     tags:
 *       - Employees
 *     summary: Update employee
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 */
router.put(
  "/employees/:id",
  employeeController.update.bind(employeeController)
);

/* =========================================================
   DELETE EMPLOYEE
========================================================= */
/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     tags:
 *       - Employees
 *     summary: Delete employee
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 */
router.delete(
  "/employees/:id",
  employeeController.delete.bind(employeeController)
);

/* =========================================================
   ASSIGN EMPLOYEE TO BRANCH + ROLE
========================================================= */
/**
 * @swagger
 * /employees/assign:
 *   post:
 *     tags:
 *       - Employees
 *     summary: Assign employee to branch and role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - branch_id
 *               - role
 *             properties:
 *               user_id:
 *                 type: number
 *                 example: 1
 *               branch_id:
 *                 type: number
 *                 example: 2
 *               role:
 *                 type: string
 *                 example: Shop_Keeper
 */
router.post(
  "/employees/assign",
  employeeController.assign.bind(employeeController)
);

export default router;