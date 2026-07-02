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
 *     summary: Add Product To Cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/cart/add",
  authenticateMiddleware,
  authorize({ roles: [UserType.CUSTOMER, UserType.SUPER_ADMIN] }),
  cartController.add.bind(cartController)
);

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get User Cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/cart",
  authenticateMiddleware,
  authorize({ roles: [UserType.CUSTOMER, UserType.SUPER_ADMIN] }),
  cartController.getCart.bind(cartController)
);

/**
 * @swagger
 * /cart/{id}:
 *   delete:
 *     summary: Remove Cart Item
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/cart/:id",
  authenticateMiddleware,
  authorize({ roles: [UserType.CUSTOMER, UserType.SUPER_ADMIN] }),
  cartController.remove.bind(cartController)
);

export default router;
