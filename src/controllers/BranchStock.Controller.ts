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
import { TenantService } from "../middleware/tenantFilter.middleware";

@Controller("/branch-stock")
export class BranchStockController {

  @Post("/update")
  @Middleware([validate(UpdateBranchStockDto)])
  @Swagger("Update Branch Stock", "Add or Remove stock per branch")
  async update(req: any, res: Response, next: NextFunction) {

    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {

      const result = await BranchStockService.updateStock({
        manager: qr.manager,
        ...req.body,
        user_id: req.user.userId,
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
  async getAll(req: any, res: Response) {

    const repo = dataSource.getRepository(BranchStock);

    const where = TenantService.scopeWhere(req.user);

    const data = await repo.find({
      where,
      relations: { product: true },
      order: { id: "DESC" },
    });

    return res.json({
      success: true,
      data,
    });
  }
}