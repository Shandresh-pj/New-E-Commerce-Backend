import { Router, Request, Response, NextFunction } from "express";
import { JwtPayload } from "jsonwebtoken";
import dataSource from "../config/database";
import { Wishlist } from "../entities/wishlist";
import { Product } from "../entities/products";
import { ApiError } from "../exceptions/ApiError";
import { ProductStatus } from "../dto/products.dto";
import authenticateMiddleware from "../middleware/authenticate.middleware";

interface AuthRequest extends Request {
  user?: string | JwtPayload;
}

const router = Router();

// The global auth gate (app.ts) guarantees a valid token before this
// router runs, so req.user.id is always present here.
function getUserId(req: AuthRequest): number {
  return Number((req.user as JwtPayload)?.id);
}

/**
 * Parse and validate a product id coming from the body or the URL params.
 * Returns a positive integer or throws a 422 ApiError.
 */
function parseProductId(raw: any): number {
  const id = Number(raw);
  if (!raw || Number.isNaN(id) || !Number.isInteger(id) || id <= 0) {
    throw new ApiError(422, "Validation Failed", {
      product_id: ["product_id must be a positive integer"],
    });
  }
  return id;
}

/**
 * @swagger
 * tags:
 *   name: Wishlist
 *   description: User product wishlist management
 */

/**
 * @swagger
 * /wishlist:
 *   post:
 *     tags:
 *       - Wishlist
 *     summary: Add product to wishlist
 *     description: Adds a product to the logged-in user's wishlist (idempotent — adding an existing item returns it without duplicating)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *             properties:
 *               product_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Product added to wishlist
 *       200:
 *         description: Product already in wishlist
 *       404:
 *         description: Product not found
 *       422:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/wishlist",
  authenticateMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);

      const productId = parseProductId(req.body.product_id);

      const product = await dataSource
        .getRepository(Product)
        .findOne({ where: { id: productId } });

      if (!product || product.status !== ProductStatus.ACTIVE) {
        throw new ApiError(404, "Product not found");
      }

      const repository = dataSource.getRepository(Wishlist);

      const existing = await repository.findOne({
        where: { user_id: userId, product_id: productId },
        relations: { product: true },
      });

      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Product already in wishlist",
          data: existing,
        });
      }

      const item = repository.create({
        user_id: userId,
        product_id: productId,
      });

      await repository.save(item);

      const saved = await repository.findOne({
        where: { id: item.id },
        relations: { product: true },
      });

      return res.status(201).json({
        success: true,
        message: "Product added to wishlist",
        data: saved,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /wishlist:
 *   get:
 *     tags:
 *       - Wishlist
 *     summary: Get user wishlist
 *     description: Returns all wishlist items for the logged-in user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/wishlist",
  authenticateMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);

      const items = await dataSource.getRepository(Wishlist).find({
        where: { user_id: userId },
        relations: { product: true },
        order: { created_at: "DESC" },
      });

      return res.json({
        success: true,
        message: "Wishlist fetched successfully",
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /wishlist/check/{productId}:
 *   get:
 *     tags:
 *       - Wishlist
 *     summary: Check if product is in wishlist
 *     description: Returns whether the given product is in the logged-in user's wishlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Check result
 *       422:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/wishlist/check/:productId",
  authenticateMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);

      const productId = parseProductId(req.params.productId);

      const item = await dataSource.getRepository(Wishlist).findOne({
        where: { user_id: userId, product_id: productId },
      });

      return res.json({
        success: true,
        message: "Wishlist check completed",
        data: { inWishlist: !!item },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /wishlist/{productId}:
 *   delete:
 *     tags:
 *       - Wishlist
 *     summary: Remove product from wishlist
 *     description: Removes a product from the logged-in user's wishlist
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product removed from wishlist
 *       404:
 *         description: Product not found in wishlist
 *       422:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized
 */
router.delete(
  "/wishlist/:productId",
  authenticateMiddleware,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = getUserId(req);

      const productId = parseProductId(req.params.productId);

      const result = await dataSource.getRepository(Wishlist).delete({
        user_id: userId,
        product_id: productId,
      });

      if (!result.affected) {
        throw new ApiError(404, "Product not found in wishlist");
      }

      return res.json({
        success: true,
        message: "Product removed from wishlist",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
