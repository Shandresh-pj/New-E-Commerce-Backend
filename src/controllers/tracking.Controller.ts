import {
  Request,
  Response,
} from "express";

import {
  Controller,
  Get,
  Post,
  Delete,
  Swagger,
} from "../decorators";

import { dataSource } from "../server";
import { DeliveryTracking } from "../entities/delivery.entity";


@Controller("/delivery-tracking")
export class DeliveryTrackingController {

  // ==========================================
  // START DELIVERY
  // ==========================================
  @Post("/start")
  @Swagger(
    "Start Delivery",
    "Delivery boy starts delivery"
  )
  async startDelivery(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        DeliveryTracking
      );

    const tracking =
      repo.create({
        ...req.body,
        status: "ON_THE_WAY",
      });

    await repo.save(tracking);

    return res.json({
      success: true,
      message:
        "Delivery started successfully",
      data: tracking,
    });
  }

  // ==========================================
  // UPDATE LIVE LOCATION
  // ==========================================
  @Post("/location")
  @Swagger(
    "Update Location",
    "Update delivery boy live location"
  )
  async updateLocation(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        DeliveryTracking
      );

    const tracking =
      repo.create(req.body);

    await repo.save(tracking);

    return res.json({
      success: true,
      message:
        "Location updated",
      data: tracking,
    });
  }

  // ==========================================
  // GET TRACKING BY ORDER
  // ==========================================
  @Get("/order/:order_id")
  @Swagger(
    "Track Order",
    "Get live order tracking"
  )
  async getTracking(
    req: Request,
    res: Response
  ) {

    const tracking =
      await dataSource
        .getRepository(
          DeliveryTracking
        )
        .find({
          where: {
            order_id: Number(
              req.params.order_id
            ),
          },
          order: {
            id: "DESC",
          },
        });

    return res.json({
      success: true,
      data: tracking,
    });
  }

  // ==========================================
  // GET ALL TRACKINGS
  // ==========================================
  @Get("/")
  @Swagger(
    "Get Tracking List",
    "Fetch all tracking records"
  )
  async getAll(
    req: Request,
    res: Response
  ) {

    const data =
      await dataSource
        .getRepository(
          DeliveryTracking
        )
        .find({
          order: {
            id: "DESC",
          },
        });

    return res.json({
      success: true,
      data,
    });
  }

  // ==========================================
  // MARK DELIVERED
  // ==========================================
  @Post("/delivered/:id")
  @Swagger(
    "Mark Delivered",
    "Mark order as delivered"
  )
  async delivered(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        DeliveryTracking
      );

    await repo.update(
      req.params.id,
      {
        status: "DELIVERED",
      }
    );

    return res.json({
      success: true,
      message:
        "Order delivered successfully",
    });
  }

  // ==========================================
  // DELETE TRACKING
  // ==========================================
  @Delete("/:id")
  async deleteTracking(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        DeliveryTracking
      );

    await repo.delete(
      req.params.id
    );

    return res.json({
      success: true,
      message:
        "Tracking deleted",
    });
  }
}