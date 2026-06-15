import { Router } from "express";
import { BranchStockController } from "../controllers/BranchStock.Controller";

const router = Router();
const controller = new BranchStockController();

/**
 * @swagger
 * /branch-stock/update:
 *   post:
 *     summary: Update branch stock
 *     tags: [Branch Stock]
 */
router.post("/branch-stock/update", controller.update.bind(controller));

/**
 * @swagger
 * /branch-stock:
 *   get:
 *     summary: Get branch stock list
 *     tags: [Branch Stock]
 */
router.get("/branch-stock", controller.getAll.bind(controller));

export default router;