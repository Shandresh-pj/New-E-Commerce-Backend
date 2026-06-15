import {
  Request,
  Response
} from "express";

import {
  Controller,
  Post,
  Get,
  Swagger
} from "../decorators";


import { dataSource } from "../server";
import { Put } from "../decorators/put";
import { LeaveRequest } from "../entities/leave.entity";

@Controller("/leave")
export class LeaveController {

  // ==========================================
  // APPLY LEAVE
  // ==========================================
  @Post("/apply")
  @Swagger(
    "Apply Leave",
    "Employee leave request"
  )
  async apply(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        LeaveRequest
      );

    const leave =
      repo.create(req.body);

    await repo.save(leave);

    return res.json({
      success: true,
      data: leave,
    });
  }

  // ==========================================
  // APPROVE LEAVE
  // ==========================================
  @Put("/approve/:id")
  async approve(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(
        LeaveRequest
      );

    await repo.update(
      req.params.id,
      {
        status: "APPROVED",
      }
    );

    return res.json({
      success: true,
      message: "Leave approved",
    });
  }

  // ==========================================
  // GET LEAVES
  // ==========================================
  @Get("/")
  async getAll(
    req: Request,
    res: Response
  ) {

    const data =
      await dataSource
        .getRepository(
          LeaveRequest
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
}