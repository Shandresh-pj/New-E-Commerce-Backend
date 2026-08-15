import {
  Request,
  Response,
} from "express";

import {
  Controller,
  Post,
  Get,
  Delete,
  Swagger,
} from "../decorators";

import dataSource from "../config/database";

import { Cart, Product } from "../entities/products";
import { ProductStatus } from "../dto/products.dto";

@Controller("/cart")
export class CartController {
  // =========================
  // ADD TO CART
  // =========================
  @Post("/add")
  @Swagger("Add To Cart", "Add product to cart")
  async addToCart(req: any, res: Response) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const { product_id, quantity } = req.body;

      const cartRepo = dataSource.getRepository(Cart);
      const productRepo = dataSource.getRepository(Product);

      const product = await productRepo.findOne({
        where: { id: product_id }
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found"
        });
      }

      if (product.status !== ProductStatus.ACTIVE) {
        return res.status(403).json({
          success: false,
          message: "This product is not active and cannot be added to the cart."
        });
      }

      // ✅ FIX: use relations instead of FK fields
      let cart = await cartRepo.findOne({
        where: {
          user: { id: userId },
          product: { id: product_id }
        },
        relations: {
          user: true,
          product: true
        }
      });

      if (cart) {
        cart.quantity += quantity;
      } else {
        cart = cartRepo.create({
          quantity,
          user: { id: userId } as any,
          product: { id: product_id } as any
        });
      }

      await cartRepo.save(cart);

      return res.json({
        success: true,
        data: cart
      });
    } catch (err: any) {
      console.error("[addToCart Error]:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to add to cart" });
    }
  }

  // =========================
  // GET CART
  // =========================
  @Get("/")
  async getCart(req: any, res: any) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const cartRepo = dataSource.getRepository(Cart);

      const data = await cartRepo.find({
        where: {
          user: { id: userId }
        },
        relations: {
          product: true
        }
      });

      return res.json({
        success: true,
        data
      });
    } catch (err: any) {
      console.error("[getCart Error]:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to fetch cart" });
    }
  }

  // =========================
  // REMOVE ITEM
  // =========================
  @Delete("/:id")
  async remove(req: any, res: any) {
    try {
      const userId = req.user?.userId || req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const cartRepo = dataSource.getRepository(Cart);

      const item = await cartRepo.findOne({
        where: { id: Number(req.params.id) },
        relations: { user: true },
      });

      if (!item) {
        return res.status(404).json({ success: false, message: "Cart item not found" });
      }

      if (item.user?.id !== userId && !req.user?.isSuperAdmin) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      await cartRepo.delete(item.id);

      return res.json({
        success: true,
        message: "Cart item removed"
      });
    } catch (err: any) {
      console.error("[removeCartItem Error]:", err);
      return res.status(500).json({ success: false, message: err.message || "Failed to remove cart item" });
    }
  }
}