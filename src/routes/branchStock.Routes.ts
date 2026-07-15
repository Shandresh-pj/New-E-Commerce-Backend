import { Router } from "express";
import { BranchStockController } from "../controllers/BranchStock.Controller";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();
const controller = new BranchStockController();

/**
 * @swagger
 * /branch-stock/update:
 *   post:
 *     summary: Update branch stock
 *     tags: [Branch Stock]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/branch-stock/update",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  auditMiddleware("BRANCH_STOCK"),
  controller.update.bind(controller)
);

/**
 * @swagger
 * /branch-stock:
 *   get:
 *     summary: Get branch stock list
 *     tags: [Branch Stock]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/branch-stock",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER, UserType.EMPLOYEE],
  }),
  controller.getAll.bind(controller)
);

/**
 * @swagger
 * /branch-stock/transfer:
 *   post:
 *     summary: POST /branch-stock/transfer
 *     tags: [BranchStock]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.post(
  "/branch-stock/transfer",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  auditMiddleware("BRANCH_STOCK_TRANSFER_REQUEST"),
  controller.requestTransfer.bind(controller)
);

/**
 * @swagger
 * /branch-stock/transfers:
 *   get:
 *     summary: GET /branch-stock/transfers
 *     tags: [BranchStock]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 */
router.get(
  "/branch-stock/transfers",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  controller.getTransfers.bind(controller)
);

/**
 * @swagger
 * /branch-stock/transfers/{id}/approve:
 *   put:
 *     summary: PUT /branch-stock/transfers/:id/approve
 *     tags: [BranchStock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
router.put(
  "/branch-stock/transfers/:id/approve",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("BRANCH_STOCK_TRANSFER_APPROVAL"),
  controller.approveTransfer.bind(controller)
);

export default router;
