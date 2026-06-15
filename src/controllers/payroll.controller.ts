import {
  Request,
  Response,
} from "express";

import {
  Controller,
  Get,
  Post,
  Swagger,
} from "../decorators";

import { dataSource } from "../server";

import { Employee } from "../entities/employee.entity";
import { Attendance } from "../entities/attendance.entity";
import { LeaveRequest } from "../entities/leave.entity";
import { Salary } from "../entities/salary";

@Controller("/payroll")
export class PayrollController {

  // ==========================================
  // GENERATE MONTHLY PAYROLL
  // ==========================================
  @Post("/generate")
  @Swagger(
    "Generate Payroll",
    "Generate salary from attendance"
  )
  async generate(
    req: Request,
    res: Response
  ) {

    const {
      employee_id,
      month,
    } = req.body;

    const employeeRepo =
      dataSource.getRepository(Employee);

    const attendanceRepo =
      dataSource.getRepository(Attendance);

    const leaveRepo =
      dataSource.getRepository(LeaveRequest);

    const salaryRepo =
      dataSource.getRepository(Salary);

    const employee =
      await employeeRepo.findOne({
        where: {
          id: employee_id,
        },
      });

    if (!employee) {
      throw new Error(
        "Employee not found"
      );
    }

    // ==========================
    // ATTENDANCE
    // ==========================

    const attendance =
      await attendanceRepo.find({
        where: {
          employee_id,
        },
      });

    const presentDays =
      attendance.length;

    const overtimeMinutes =
      attendance.reduce(
        (sum, row) =>
          sum +
          row.overtime_minutes,
        0
      );

    // ==========================
    // LEAVES
    // ==========================

    const leaves =
      await leaveRepo.find({
        where: {
          employee_id,
          status: "APPROVED",
        },
      });

    const leaveDays =
      leaves.length;

    // ==========================
    // SALARY CALCULATION
    // ==========================

    const daysInMonth = 30;

    const perDaySalary =
      Number(employee.salary) /
      daysInMonth;

    const attendanceSalary =
      presentDays *
      perDaySalary;

    const overtimeSalary =
      (
        overtimeMinutes / 60
      ) *
      (
        Number(employee.salary) /
        240
      );

    const finalSalary =
      attendanceSalary +
      overtimeSalary;

    const payroll =
      salaryRepo.create({
        employee_id,
        company_id:
          employee.company_id,
        month,
        basic_salary:
          employee.salary,
        present_days:
          presentDays,
        leave_days:
          leaveDays,
        overtime_minutes:
          overtimeMinutes,
        final_salary:
          finalSalary,
      });

    await salaryRepo.save(
      payroll
    );

    return res.json({
      success: true,
      message:
        "Payroll generated",
      data: payroll,
    });
  }

  // ==========================================
  // PAYROLL LIST
  // ==========================================
  @Get("/")
  @Swagger(
    "Payroll List",
    "Get all payroll records"
  )
  async getAll(
    req: Request,
    res: Response
  ) {

    const payroll =
      await dataSource
        .getRepository(Salary)
        .find({
          order: {
            id: "DESC",
          },
        });

    return res.json({
      success: true,
      data: payroll,
    });
  }

  // ==========================================
  // SINGLE PAYROLL
  // ==========================================
  @Get("/:id")
  @Swagger(
    "Payroll Details",
    "Get payroll by id"
  )
  async getOne(
    req: Request,
    res: Response
  ) {

    const payroll =
      await dataSource
        .getRepository(Salary)
        .findOne({
          where: {
            id: Number(
              req.params.id
            ),
          },
        });

    return res.json({
      success: true,
      data: payroll,
    });
  }
}