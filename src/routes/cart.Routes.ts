import { Router } from "express";
import { cartController } from "../controllers";
import authenticateMiddleware from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize";
import { UserType } from "../utils/Role-Access";

const router = Router();

/**
 * @swagger
 * /cart/add:
 *   post:
 *     summary: Add Product Item To Cart
 *     description: Add a product item to customer cart or update item quantity.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 example: "prd_1001"
 *                 description: Target Product ID (Required)
 *               quantity:
 *                 type: integer
 *                 example: 1
 *                 default: 1
 *                 description: Quantity to add (Required)
 *               variantId:
 *                 type: string
 *                 example: "var_05"
 *                 description: Product variant option ID (Optional)
 *     responses:
 *       200:
 *         description: Cart item added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid quantity or product unavailable
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/cart/add",
  authenticateMiddleware,
  authorize({ roles: [UserType.CUSTOMER, UserType.SUPER_ADMIN, UserType.ADMIN] }),
  cartController.addToCart.bind(cartController)
);

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get Logged-In User Cart
 *     description: Fetch current user active shopping cart items, line subtotals, and total price.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User cart details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/cart",
  authenticateMiddleware,
  authorize({ roles: [UserType.CUSTOMER, UserType.SUPER_ADMIN, UserType.ADMIN] }),
  cartController.getCart.bind(cartController)
);

/**
 * @swagger
 * /cart/{id}:
 *   delete:
 *     summary: Remove Item From Cart
 *     description: Remove a cart item by item ID.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Cart Item ID (Required)
 *     responses:
 *       200:
 *         description: Cart item removed
 *       404:
 *         description: Item not found in cart
 */
router.delete(
  "/cart/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.CUSTOMER, UserType.SUPER_ADMIN, UserType.ADMIN] }),
  cartController.remove.bind(cartController)
);

export default router;

