import { Router } from "express";
import { employeeController } from "../controllers";

const router = Router();

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Get Employees
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Employee list
 */
router.get(
  "/employees",
  employeeController.getAll.bind(employeeController)
);

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update Employees
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Update Employee list
 */
router.put(
  "/employees/{id}",
  employeeController.update.bind(employeeController)
);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: id Based Employees
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: id Based Employee 
 */
router.get(
  "/employees/{id}",
  employeeController.getOne.bind(employeeController)
);

/**
 * @swagger
 * /employees/create:
 *   post:
 *     summary: Create Employee
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: Employee created
 */
router.post(
  "/employees/create",
  employeeController.create.bind(employeeController)
);

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: Delete Employee
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Employee deleted
 */
router.delete(
  "/employees/:id",
  employeeController.delete.bind(employeeController)
);

export default router;