import { Router } from "express";
import { invoiceController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

const allowedRoles = [
  UserType.SUPER_ADMIN,
  UserType.ADMIN,
  UserType.BRANCH,
  UserType.BRANCH_MANAGER,
  UserType.SHOPKEEPER,
  UserType.CUSTOMER,
  UserType.EMPLOYEE
];

/**
 * @swagger
 * /invoices/suggestions:
 *   get:
 *     summary: GET /invoices/suggestions
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/invoices/suggestions",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.getSuggestions.bind(invoiceController)
);

/**
 * @swagger
 * /invoices/create:
 *   post:
 *     summary: POST /invoices/create
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/invoices/create",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.create.bind(invoiceController)
);

/**
 * @swagger
 * /invoices/print:
 *   post:
 *     summary: POST /invoices/print
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/invoices/print",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.print.bind(invoiceController)
);

/**
 * @swagger
 * /invoices/download:
 *   post:
 *     summary: POST /invoices/download
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/invoices/download",
  authenticateMiddleware,
  authorize({ roles: allowedRoles }),
  invoiceController.download.bind(invoiceController)
);

export default router;
