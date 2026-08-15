import {
  Request,
  Response,
  NextFunction,
} from "express";

import dataSource from "../config/database";
import { Status } from "../entities/status.entity";

export class StatusController {

  // ================= LIST (dropdown source) =================
  // GET /Status/All  (optional ?StatusFor filter)
  public async index(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const where: any = {};
      if (request.query.StatusFor) {
        where.StatusFor = request.query.StatusFor;
      }

      const rows = await dataSource
        .getRepository(Status)
        .find({
          where,
          order: { Id: "ASC" },
        });

      const formatted = rows.map((r) => ({
        ...r,
        id: r.Id,
        name: r.StatusCode,
        module: r.StatusFor,
        color_code: "#3B82F6",
      }));

      return response.json({
        success: true,
        message: "Statuses fetched successfully",
        data: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= CREATE =================
  // POST /Status/Add  { StatusCode / name, StatusFor / module? }
  public async create(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const StatusCode = request.body.StatusCode || request.body.name;
      const StatusFor = request.body.StatusFor || request.body.module || "COMMON";

      if (!StatusCode) {
        return response.status(400).json({
          success: false,
          message: "StatusCode / name is required",
        });
      }

      const repo = dataSource.getRepository(Status);

      const existing = await repo.findOne({
        where: { StatusCode, StatusFor },
      });

      if (existing) {
        return response.status(400).json({
          success: false,
          message: "Status already exists",
        });
      }

      const status = repo.create({ StatusCode, StatusFor });
      await repo.save(status);

      return response.json({
        success: true,
        message: "Status added successfully",
        data: { Id: status.Id, id: status.Id, name: status.StatusCode, module: status.StatusFor },
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= UPDATE =================
  // POST /Status/Update/:Id
  public async update(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      const Id = Number(request.params.Id);
      const repo = dataSource.getRepository(Status);

      const status = await repo.findOne({ where: { Id } });

      if (!status) {
        return response.status(404).json({
          success: false,
          message: "Status not found",
        });
      }

      const StatusCode = request.body.StatusCode || request.body.name;
      const StatusFor = request.body.StatusFor || request.body.module;

      if (StatusCode !== undefined) {
        status.StatusCode = StatusCode;
      }
      if (StatusFor !== undefined) {
        status.StatusFor = StatusFor;
      }

      await repo.save(status);

      return response.json({
        success: true,
        message: "Status updated successfully",
        data: { Id: status.Id, id: status.Id, name: status.StatusCode, module: status.StatusFor },
      });
    } catch (error) {
      next(error);
    }
  }

  // ================= DELETE =================
  // DELETE /Status/:Id
  public async deleteItem(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    try {
      await dataSource
        .getRepository(Status)
        .delete(Number(request.params.Id));

      return response.json({
        success: true,
        message: "Status deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
