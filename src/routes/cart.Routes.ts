import { cartController } from "../controllers";
import { Router } from "express";
const router = Router();

/**
 * @swagger
 * /cart/add:
 *   post:
 *     summary: Add Product To Cart
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_id:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Product added to cart successfully
 */
router.post(
  "/cart/add",
  cartController.add.bind(
    cartController
  )
);

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get User Cart
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Cart fetched successfully
 */
router.get(
  "/cart",
  cartController.getCart.bind(
    cartController
  )
);

/**
 * @swagger
 * /cart/{id}:
 *   delete:
 *     summary: Remove Cart Item
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cart item removed successfully
 */
router.delete(
  "/cart/:id",
  cartController.remove.bind(
    cartController
  )
);


export default router;