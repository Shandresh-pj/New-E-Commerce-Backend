import {
  Controller,
  Post,
  Get,
  Middleware,
  Swagger,
} from "../decorators";

import { Request, Response, NextFunction } from "express";
import { dataSource } from "../server";
import { UpdateBranchStockDto } from "../dto/branchStock.dto";
import validate from "../middleware/validate";
import { BranchStockService } from "../services/branchStock.service";
import { BranchStock } from "../entities/branch_stock";

@Controller("/branch-stock")
export class BranchStockController {

  @Post("/update")
  @Middleware([validate(UpdateBranchStockDto)])
  @Swagger("Update Branch Stock", "Add or Remove stock per branch")
  async update(req: Request, res: Response, next: NextFunction) {

    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {

      const result = await BranchStockService.updateStock({
        manager: qr.manager,
        ...req.body,
        user_id: 1, // replace with auth user
      });

      await qr.commitTransaction();

      return res.json({
        success: true,
        message: "Branch stock updated",
        data: result,
      });

    } catch (err) {
      await qr.rollbackTransaction();
      next(err);
    } finally {
      await qr.release();
    }
  }

  @Get("/")
  @Swagger("Get Branch Stocks", "List all branch stock data")
  async getAll(req: Request, res: Response) {

    const repo = dataSource.getRepository(BranchStock);

    const data = await repo.find({
      relations: { product: true },
      order: { id: "DESC" },
    });

    return res.json({
      success: true,
      data,
    });
  }
}