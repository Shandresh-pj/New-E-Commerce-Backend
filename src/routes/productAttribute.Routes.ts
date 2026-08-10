import { Router } from "express";

const router = Router();

/**
 * @swagger
 * /product-attributes:
 *   get:
 *     summary: List Product Attributes
 *     description: Retrieve configurable product attributes (colors, sizes, specs).
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of product attributes
 */
router.get("/product-attributes", (req, res) => {
  res.json({ success: true, message: "Product attributes endpoint", data: [] });
});

export default router;
