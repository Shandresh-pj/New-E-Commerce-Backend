import { Router } from "express";

const router = Router();

/**
 * @swagger
 * /branch-stock:
 *   get:
 *     summary: Branch Stock Inventory Overview
 *     description: Retrieve branch stock inventory records across outlets.
 *     tags: [Branch]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Branch stock list
 */
router.get("/branch-stock", (req, res) => {
  res.json({ success: true, message: "Branch stock endpoint", data: [] });
});

export default router;
