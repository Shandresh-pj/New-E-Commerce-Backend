import { Router } from "express";
import { branchStockController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: BranchStock
 *   description: Multi-branch inventory management and inter-branch stock transfer operations
 */

/**
 * @swagger
 * /branch-stock:
 *   get:
 *     summary: Get Branch Stock Inventory Overview
 *     description: Retrieve branch stock inventory records across outlets for the logged-in user's company.
 *     tags: [BranchStock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branch_id
 *         schema:
 *           type: integer
 *         description: Optional filter by branch ID
 *       - in: query
 *         name: branch_name
 *         schema:
 *           type: string
 *         description: Optional filter by branch name
 *     responses:
 *       200:
 *         description: Branch stock list fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       company_id:
 *                         type: integer
 *                         example: 1
 *                       branch_name:
 *                         type: string
 *                         example: "Main Branch"
 *                       product_id:
 *                         type: integer
 *                         example: 101
 *                       stock:
 *                         type: integer
 *                         example: 50
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/branch-stock",
  authenticateMiddleware,
  authorize(),
  branchStockController.getAll.bind(branchStockController)
);

/**
 * @swagger
 * /branch-stock/update:
 *   post:
 *     summary: Update Branch Stock Level
 *     description: Add, remove, or set stock levels for a specific product at a branch.
 *     tags: [BranchStock]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branch_name
 *               - product_id
 *               - quantity
 *               - action
 *             properties:
 *               company_id:
 *                 type: integer
 *                 example: 1
 *               branch_name:
 *                 type: string
 *                 example: "Main Branch"
 *               product_id:
 *                 type: integer
 *                 example: 101
 *               quantity:
 *                 type: integer
 *                 example: 10
 *               action:
 *                 type: string
 *                 enum: [ADD, REMOVE, SET]
 *                 example: "ADD"
 *               reason:
 *                 type: string
 *                 example: "Shipment received"
 *     responses:
 *       200:
 *         description: Branch stock updated successfully
 *       400:
 *         description: Validation error or insufficient stock
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post(
  "/branch-stock/update",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER] }),
  auditMiddleware("BRANCH_STOCK_UPDATE"),
  branchStockController.update.bind(branchStockController)
);

/**
 * @swagger
 * /branch-stock/transfer:
 *   post:
 *     summary: Request Inter-Branch Stock Transfer
 *     description: Request transfer of product stock quantity from one branch to another.
 *     tags: [BranchStock]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - from_branch
 *               - to_branch
 *               - product_id
 *               - quantity
 *             properties:
 *               from_branch:
 *                 type: string
 *                 example: "Main Branch"
 *               to_branch:
 *                 type: string
 *                 example: "North Outlet"
 *               product_id:
 *                 type: integer
 *                 example: 101
 *               quantity:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Transfer request created successfully
 *       400:
 *         description: Insufficient stock or invalid payload
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/branch-stock/transfer",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER] }),
  auditMiddleware("BRANCH_STOCK_TRANSFER"),
  branchStockController.requestTransfer.bind(branchStockController)
);

/**
 * @swagger
 * /branch-stock/transfers:
 *   get:
 *     summary: List Inter-Branch Stock Transfer Requests
 *     description: Retrieve list of all pending, approved, or rejected inter-branch stock transfer requests.
 *     tags: [BranchStock]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transfer list fetched successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/branch-stock/transfers",
  authenticateMiddleware,
  authorize(),
  branchStockController.getTransfers.bind(branchStockController)
);

/**
 * @swagger
 * /branch-stock/transfers/{id}/approve:
 *   put:
 *     summary: Approve or Reject Inter-Branch Transfer Request
 *     description: Approve (deducts source stock & adds destination stock) or reject a branch transfer request.
 *     tags: [BranchStock]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Transfer Request ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [APPROVE, REJECT]
 *                 example: "APPROVE"
 *               rejection_reason:
 *                 type: string
 *                 example: "Out of stock at source outlet"
 *     responses:
 *       200:
 *         description: Transfer request processed successfully
 *       400:
 *         description: Invalid state or insufficient stock
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transfer record not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/branch-stock/transfers/:id/approve",
  authenticateMiddleware,
  authorize({ roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER] }),
  auditMiddleware("BRANCH_TRANSFER_APPROVAL"),
  branchStockController.approveTransfer.bind(branchStockController)
);

export default router;
