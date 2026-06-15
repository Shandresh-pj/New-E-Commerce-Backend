import { Router } from "express";
import { payrollController } from "../controllers";





const router = Router();


/**
 * @swagger
 * /payroll/generate:
 *   post:
 *     summary: Generate Payroll
 *     tags: [Payroll]
 *     responses:
 *       200:
 *         description: Payroll generated successfully
 */
router.post(
  "/payroll/generate",
  payrollController.generate.bind(
    payrollController
  )
);

/**
 * @swagger
 * /payroll:
 *   get:
 *     summary: Get Payroll List
 *     tags: [Payroll]
 *     responses:
 *       200:
 *         description: Payroll list fetched successfully
 */
router.get(
  "/payroll",
  payrollController.getAll.bind(
    payrollController
  )
);

/**
 * @swagger
 * /payroll/{id}:
 *   get:
 *     summary: Get Payroll Details
 *     tags: [Payroll]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payroll details fetched successfully
 */
router.get(
  "/payroll/:id",
  payrollController.getOne.bind(
    payrollController
  )
);

export default router;