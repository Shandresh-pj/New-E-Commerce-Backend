import {
  Request,
  Response,
  NextFunction
} from "express";

import {
  Controller,
  Get,
  Post,
  Delete,
  Swagger,
  Middleware
} from "../decorators";

import validate from "../middleware/validate";


import { Employee } from "../entities/employee.entity";

import { dataSource } from "../server";
import { Put } from "../decorators/put";
import { CreateEmployeeDto } from "../dto";

@Controller("/employees")
export class EmployeeController {

  // ==========================================
  // CREATE EMPLOYEE
  // ==========================================
  @Post("/create")
  @Middleware([
    validate(CreateEmployeeDto)
  ])
  @Swagger(
    "Create Employee",
    "Create new employee"
  )
  async create(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(Employee);

    const employee =
      repo.create(req.body);

    await repo.save(employee);

    return res.json({
      success: true,
      data: employee,
    });
  }

  // ==========================================
  // GET ALL EMPLOYEES
  // ==========================================
  @Get("/")
  @Swagger(
    "Get Employees",
    "Get all employees"
  )
  async getAll(
    req: Request,
    res: Response
  ) {

    const data =
      await dataSource
        .getRepository(Employee)
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
  // GET EMPLOYEE
  // ==========================================
  @Get("/:id")
  async getOne(
    req: Request,
    res: Response
  ) {

    const employee =
      await dataSource
        .getRepository(Employee)
        .findOne({
          where: {
            id: Number(req.params.id),
          },
        });

    return res.json({
      success: true,
      data: employee,
    });
  }

  // ==========================================
  // UPDATE EMPLOYEE
  // ==========================================
  @Put("/:id")
  @Middleware([
    validate(CreateEmployeeDto)
  ])
  async update(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(Employee);

    await repo.update(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      message: "Employee updated",
    });
  }

  // ==========================================
  // DELETE EMPLOYEE
  // ==========================================
  @Delete("/:id")
  async delete(
    req: Request,
    res: Response
  ) {

    await dataSource
      .getRepository(Employee)
      .delete(req.params.id);

    return res.json({
      success: true,
      message: "Employee deleted",
    });
  }
}