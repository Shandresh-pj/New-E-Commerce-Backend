import { Router } from "express";
import { payrollController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /payroll/generate:
 *   post:
 *     summary: Generate Payroll
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/payroll/generate",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN] }),
  auditMiddleware("PAYROLL"),
  payrollController.generate.bind(payrollController)
);

/**
 * @swagger
 * /payroll:
 *   get:
 *     summary: Get Payroll List
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/payroll",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  payrollController.getAll.bind(payrollController)
);

/**
 * @swagger
 * /payroll/{id}:
 *   get:
 *     summary: Get Payroll Details
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/payroll/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  payrollController.getOne.bind(payrollController)
);

export default router;
