import { Request, Response } from "express";
import { dataSource } from "../server";
import { Register } from "../entities/register";

export class EmployeeController {

  // ======================================
  // CREATE EMPLOYEE
  // ======================================
  async create(req: any, res: Response) {

    const repo = dataSource.getRepository(Register);

    const employee = repo.create({
      name: req.body.name,
      email: req.body.email,
      mobilenumber: req.body.mobilenumber,
      password: req.body.password,
      // usertype: req.body.usertype || "Customer",
      // company_id: req.body.company_id
    });

    await repo.save(employee);

    return res.json({
      success: true,
      message: "Employee created",
      data: employee
    });
  }

  // ======================================
  // GET ALL EMPLOYEES (COMPANY WISE)
  // ======================================
  async getAll(req: any, res: Response) {

    const company_id = Number(req.query.company_id);

    const repo = dataSource.getRepository(Register);

    const data = await repo.find({
      // where: { company_id },
      order: { id: "DESC" }
    });

    return res.json({
      success: true,
      data
    });
  }

  // ======================================
  // GET SINGLE EMPLOYEE
  // ======================================
  async getOne(req: any, res: Response) {

    const repo = dataSource.getRepository(Register);

    const data = await repo.findOne({
      where: { id: Number(req.params.id) }
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    return res.json({
      success: true,
      data
    });
  }

  // ======================================
  // UPDATE EMPLOYEE
  // ======================================
  async update(req: any, res: Response) {

    const repo = dataSource.getRepository(Register);

    const employee = await repo.findOne({
      where: { id: Number(req.params.id) }
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    repo.merge(employee, req.body);

    await repo.save(employee);

    return res.json({
      success: true,
      message: "Employee updated",
      data: employee
    });
  }

  // ======================================
  // DELETE EMPLOYEE
  // ======================================
  async delete(req: any, res: Response) {

    const repo = dataSource.getRepository(Register);

    await repo.delete(req.params.id);

    return res.json({
      success: true,
      message: "Employee deleted"
    });
  }

  // ======================================
  // ASSIGN BRANCH + ROLE
  // ======================================
  async assign(req: any, res: Response) {

    const { user_id, branch_id, role } = req.body;

    const repo = dataSource.getRepository(Register);

    const user = await repo.findOne({
      where: { id: user_id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // user.branch = branch_id;
    // user.usertype = role;

    await repo.save(user);

    return res.json({
      success: true,
      message: "Employee assigned to branch",
      data: user
    });
  }
}