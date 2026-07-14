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
 * /payroll/summary:
 *   get:
 *     summary: Get Payroll Summary
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/payroll/summary",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  payrollController.summary.bind(payrollController)
);

/**
 * @swagger
 * /payroll/slip/{id}:
 *   get:
 *     summary: Get Payslip Detail
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/payroll/slip/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.EMPLOYEE],
  }),
  payrollController.payslip.bind(payrollController)
);

/**
 * @swagger
 * /payroll/approve/{id}:
 *   post:
 *     summary: Approve Payroll
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/payroll/approve/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER],
  }),
  auditMiddleware("PAYROLL_APPROVE"),
  payrollController.approve.bind(payrollController)
);

/**
 * @swagger
 * /payroll/mark-paid/{id}:
 *   post:
 *     summary: Mark Payroll Paid
 *     tags: [Payroll]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/payroll/mark-paid/:id",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("PAYROLL_PAID"),
  payrollController.markPaid.bind(payrollController)
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
