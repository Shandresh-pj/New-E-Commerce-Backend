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

import { dataSource } from "../server";

import { Cart, Product } from "../entities/products";

@Controller("/cart")
export class CartController {
 // =========================
  // ADD TO CART
  // =========================
  @Post("/add")
  @Swagger("Add To Cart", "Add product to cart")
  async add(req: any, res: any) {

    const cartRepo = dataSource.getRepository(Cart);
    const productRepo = dataSource.getRepository(Product);

    const { product_id, quantity } = req.body;
    const userId = req.user.id;

    const product = await productRepo.findOne({
      where: { id: product_id }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
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
  }

  // =========================
  // GET CART
  // =========================
  @Get("/")
  async getCart(req: any, res: any) {

    const cartRepo = dataSource.getRepository(Cart);

    const data = await cartRepo.find({
      where: {
        user: { id: req.user.id }
      },
      relations: {
        product: true
      }
    });

    return res.json({
      success: true,
      data
    });
  }

  // =========================
  // REMOVE ITEM
  // =========================
  @Delete("/:id")
  async remove(req: any, res: any) {

    await dataSource.getRepository(Cart).delete({
      id: Number(req.params.id)
    });

    return res.json({
      success: true,
      message: "Cart item removed"
    });
  }
}