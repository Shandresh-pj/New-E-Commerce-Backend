import { Router } from "express";
import { stockController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { auditMiddleware } from "../middleware/audit.Middleware";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /stock/update:
 *   post:
 *     summary: Update Product Stock
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/stock/update",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  auditMiddleware("STOCK"),
  stockController.updateStock.bind(stockController)
);

/**
 * @swagger
 * /stock/logs:
 *   get:
 *     summary: Get all stock logs
 *     tags: [Stock]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/stock/logs",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER, UserType.EMPLOYEE],
  }),
  stockController.logs.bind(stockController)
);

/**
 * @swagger
 * /stock/logs/{id}/approve:
 *   put:
 *     summary: PUT /stock/logs/:id/approve
 *     tags: [Stock]
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
  "/stock/logs/:id/approve",
  authenticateMiddleware,
  authorize({
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN],
  }),
  auditMiddleware("STOCK_APPROVAL"),
  stockController.approveStock.bind(stockController)
);

export default router;
