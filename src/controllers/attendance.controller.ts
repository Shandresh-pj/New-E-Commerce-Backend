import moment from "moment";
import { Request, Response } from "express";

import {
  Controller,
  Post,
  Get,
  Swagger
} from "../decorators";
import { dataSource } from "../server";
import { Attendance } from "../entities/attendance.entity";
import { nowDate, nowTime } from "../utils/dateTime";
import { TenantService } from "../middleware/tenantFilter.middleware";


@Controller("/attendance")
export class AttendanceController {

  // ==========================================
  // CHECK IN
  // ==========================================

  @Post("/check-in")
  @Swagger(
    "Employee Check In",
    "Employee attendance check in"
  )
  async checkIn(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(Attendance);

    const attendance =
      repo.create({

        employee_id:
          req.body.employee_id,

        company_id:
          req.body.company_id,

        branch_id:
          req.body.branch_id,

        attendance_date:
          nowDate(),

        check_in:
          nowTime(),

        status: "PRESENT"
      });

    await repo.save(attendance);

    return res.json({
      success: true,
      message:
        "Check-in successful",
      data: attendance,
    });
  }

  // ==========================================
  // CHECK OUT
  // ==========================================

  @Post("/check-out/:id")
  @Swagger(
    "Employee Check Out",
    "Employee attendance check out"
  )
  async checkOut(
    req: Request,
    res: Response
  ) {

    const repo =
      dataSource.getRepository(Attendance);

    const attendance =
      await repo.findOne({
        where: {
          id: Number(req.params.id),
        },
      });

    if (!attendance) {
      throw new Error(
        "Attendance not found"
      );
    }

    attendance.check_out =
      nowTime();

    // ======================
    // TOTAL WORKING TIME
    // ======================

    const checkIn =
      moment(
        attendance.check_in,
        "HH:mm:ss"
      );

    const checkOut =
      moment(
        attendance.check_out,
        "HH:mm:ss"
      );

    const totalMinutes =
      checkOut.diff(
        checkIn,
        "minutes"
      );

    attendance.total_minutes =
      totalMinutes;

    // ======================
    // BREAK
    // ======================

    attendance.break_minutes = 60;

    // ======================
    // OVERTIME
    // ======================

    const officeMinutes =
      8 * 60;

    if (
      totalMinutes >
      officeMinutes
    ) {

      attendance.overtime_minutes =
        totalMinutes -
        officeMinutes;
    }

    await repo.save(attendance);

    return res.json({
      success: true,
      message:
        "Check-out successful",
      data: attendance,
    });
  }

  // ==========================================
  // GET ATTENDANCE
  // ==========================================
@Get("/")
@Swagger("Attendance List", "Get all attendance")
async getAll(req: any, res: Response) {

  const repo = dataSource.getRepository(Attendance);

  const pagination = req.pagination || {
    page: 1,
    limit: 10,
    skip: 0,
  };

const { page, limit, skip } = pagination;
  const where = TenantService.scopeWhere(req.user);
  const [data, total] = await repo.findAndCount({
    where,
    order: {
      id: "DESC",
    },
    skip,
    take: limit,
  });

  return res.json({
    success: true,
    data,
    total,
    page,
    limit,
    lastPage: Math.ceil(total / limit),
  });
}
}