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

  // ==========================================
  // ADD TO CART
  // ==========================================

  @Post("/add")
  @Swagger(
    "Add To Cart",
    "Add product to user cart"
  )
  async add(
    req: any,
    res: Response
  ) {

    const cartRepo =
      dataSource.getRepository(Cart);

    const productRepo =
      dataSource.getRepository(Product);

    const {
      product_id,
      quantity,
    } = req.body;

    const user_id =
      req.user.id;

    const product =
      await productRepo.findOne({
        where: {
          id: product_id,
        },
      });

    if (!product) {
      throw new Error(
        "Product not found"
      );
    }

    let cart =
      await cartRepo.findOne({
        where: {
          user_id,
          product_id,
        },
      });

    if (cart) {

      cart.quantity += quantity;

      await cartRepo.save(cart);

    } else {

      cart = cartRepo.create({
        user_id,
        product_id,
        quantity,
      });

      await cartRepo.save(cart);
    }

    return res.json({
      success: true,
      data: cart,
    });
  }

  // ==========================================
  // GET MY CART
  // ==========================================

  @Get("/")
  async getCart(
    req: any,
    res: Response
  ) {

    const data =
      await dataSource
        .getRepository(Cart)
        .find({
          where: {
            user_id:
              req.user.id,
          },
          relations: {product : true}
            
          ,
        });

    return res.json({
      success: true,
      data,
    });
  }

  // ==========================================
  // REMOVE CART ITEM
  // ==========================================

  @Delete("/:id")
  async remove(
    req: Request,
    res: Response
  ) {

    await dataSource
      .getRepository(Cart)
      .delete(
        req.params.id
      );

    return res.json({
      success: true,
      message:
        "Cart item removed",
    });
  }
}