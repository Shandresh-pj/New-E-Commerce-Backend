import { Router } from "express";
import { employeeController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { auditMiddleware } from "../middleware/audit.Middleware";

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
 *     description: Get employee list with pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           example: 10
 *     responses:
 *       200:
 *         description: Employee list fetched successfully
 */
router.get(
  "/employees",
  employeeController.getAll.bind(
    employeeController
  )
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
 *     responses:
 *       200:
 *         description: Employee details
 *       404:
 *         description: Employee not found
 */
router.get(
  "/employees/:id",
  employeeController.getOne.bind(
    employeeController
  )
);


/* =========================================================
   CREATE EMPLOYEE
========================================================= */
/**
 * @swagger
 * /employees:
 *   post:
 *     tags:
 *       - Employees
 *     summary: Create employee
 *     description: Create employee and send temporary password email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - mobilenumber
 *               - company_id
 *               - branch_id
 *               - role_id
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *
 *               email:
 *                 type: string
 *                 example: john@gmail.com
 *
 *               mobilenumber:
 *                 type: string
 *                 example: 9876543210
 *
 *               company_id:
 *                 type: number
 *                 example: 1
 *
 *               branch_id:
 *                 type: number
 *                 example: 1
 *
 *               role_id:
 *                 type: number
 *                 example: 3
 *
 *               userType:
 *                 type: string
 *                 enum:
 *                   - EMPLOYEE
 *                 example: EMPLOYEE
 *
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       409:
 *         description: Email already exists
 */
router.post(
  "/employees",
  authenticateMiddleware, auditMiddleware("EMPLOYEE"),
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
 *
 *               email:
 *                 type: string
 *
 *               mobilenumber:
 *                 type: string
 *
 *     responses:
 *       200:
 *         description: Employee updated
 */
router.put(
  "/employees/:id",
  authenticateMiddleware, auditMiddleware("EMPLOYEE"),
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
 *           example: 1
 *
 *     responses:
 *       200:
 *         description: Employee deleted
 */
router.delete(
  "/employees/:id",
  authenticateMiddleware, auditMiddleware("EMPLOYEE"),
  employeeController.delete.bind(employeeController)
);


/* =========================================================
   ASSIGN ROLE + BRANCH
========================================================= */
// /**
//  * @swagger
//  * /employees/assign:
//  *   post:
//  *     tags:
//  *       - Employees
//  *     summary: Assign employee branch and role
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - user_id
//  *               - company_id
//  *               - branch_id
//  *               - role_id
//  *
//  *             properties:
//  *               user_id:
//  *                 type: number
//  *                 example: 1
//  *
//  *               company_id:
//  *                 type: number
//  *                 example: 1
//  *
//  *               branch_id:
//  *                 type: number
//  *                 example: 2
//  *
//  *               role_id:
//  *                 type: number
//  *                 example: 3
//  *
//  *     responses:
//  *       200:
//  *         description: Employee assigned successfully
//  */
// router.post(
//   "/employees/assign",
//   employeeController.assign.bind(
//     employeeController
//   )
// );

export default router;