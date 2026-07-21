import { Request, Response } from "express";
import dataSource from "../config/database";
import { CompanyCalendar, HolidayType } from "../entities/company_calendar.entity";

export class CalendarController {
  private static get repo() {
    return dataSource.getRepository(CompanyCalendar);
  }

  static async getHolidays(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user?.company_id || 1;
      const holidays = await CalendarController.repo.find({
        where: { company_id: companyId, is_active: true },
        order: { holiday_date: "ASC" }
      });

      res.status(200).json({
        success: true,
        data: holidays
      });
    } catch (error: any) {
      console.error("[CalendarController.getHolidays]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async createHoliday(req: Request, res: Response): Promise<void> {
    try {
      const companyId = (req as any).user?.company_id || 1;
      const { holiday_name, holiday_date, type, description } = req.body;

      if (!holiday_name || !holiday_date) {
        res.status(400).json({ success: false, message: "Holiday name and date are required." });
        return;
      }

      const holiday = CalendarController.repo.create({
        company_id: companyId,
        holiday_name,
        holiday_date,
        type: type || HolidayType.MANDATORY,
        description,
        is_active: true
      });

      await CalendarController.repo.save(holiday);

      res.status(201).json({
        success: true,
        message: "Holiday added successfully.",
        data: holiday
      });
    } catch (error: any) {
      console.error("[CalendarController.createHoliday]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateHoliday(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = (req as any).user?.company_id || 1;

      const holiday = await CalendarController.repo.findOne({
        where: { id: Number(id), company_id: companyId }
      });

      if (!holiday) {
        res.status(404).json({ success: false, message: "Holiday record not found." });
        return;
      }

      Object.assign(holiday, req.body);
      await CalendarController.repo.save(holiday);

      res.status(200).json({
        success: true,
        message: "Holiday updated successfully.",
        data: holiday
      });
    } catch (error: any) {
      console.error("[CalendarController.updateHoliday]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async deleteHoliday(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = (req as any).user?.company_id || 1;

      const holiday = await CalendarController.repo.findOne({
        where: { id: Number(id), company_id: companyId }
      });

      if (!holiday) {
        res.status(404).json({ success: false, message: "Holiday record not found." });
        return;
      }

      holiday.is_active = false;
      await CalendarController.repo.save(holiday);

      res.status(200).json({
        success: true,
        message: "Holiday deleted successfully."
      });
    } catch (error: any) {
      console.error("[CalendarController.deleteHoliday]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
