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
    roles: [UserType.SUPER_ADMIN, UserType.ADMIN, UserType.BRANCH_MANAGER, UserType.SHOPKEEPER],
  }),
  stockController.logs.bind(stockController)
);

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
