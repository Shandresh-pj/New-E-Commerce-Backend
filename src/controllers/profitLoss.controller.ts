import { Request, Response } from "express";
import { getRepository } from "typeorm";
import { ProfitLoss } from "../entities/profit_loss.entity";
import { Order } from "../entities/order";
import { Salary } from "../entities/salary";
import { StatusCodes } from "http-status-codes";

export class ProfitLossController {

  // Create Manual Entry
  static async create(req: Request, res: Response) {
    try {
      const { company_id, branch_id, record_date, revenue, expenses, notes } = req.body;

      const net_profit = (revenue || 0) - (expenses || 0);

      const repo = getRepository(ProfitLoss);
      const entry = repo.create({
        company_id,
        branch_id,
        record_date,
        revenue,
        expenses,
        net_profit,
        entry_type: "MANUAL",
        notes
      });

      await repo.save(entry);

      return res.status(StatusCodes.CREATED).json({
        success: true,
        message: "Manual Profit & Loss entry created successfully.",
        data: entry
      });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to create Profit & Loss entry."
      });
    }
  }

  // Get All Entries
  static async getAll(req: Request, res: Response) {
    try {
      const { company_id } = req.query;
      const repo = getRepository(ProfitLoss);

      const query = repo.createQueryBuilder("pl");
      
      if (company_id) {
        query.where("pl.company_id = :company_id", { company_id });
      }

      query.orderBy("pl.record_date", "DESC");

      const records = await query.getMany();

      return res.status(StatusCodes.OK).json({
        success: true,
        data: records
      });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch Profit & Loss records."
      });
    }
  }

  // Delete Entry
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const repo = getRepository(ProfitLoss);

      await repo.delete(id);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "Record deleted successfully."
      });
    } catch (error) {
      console.error(error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to delete record."
      });
    }
  }

  // Auto Calculate P&L for a given date range
  static async autoCalculate(req: Request, res: Response) {
    try {
      const { company_id, start_date, end_date } = req.body;

      if (!company_id || !start_date || !end_date) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: "company_id, start_date, and end_date are required."
        });
      }

      // 1. Calculate Revenue from Orders
      const orderRepo = getRepository(Order);
      const orders = await orderRepo.createQueryBuilder("order")
        .where("order.company_id = :company_id", { company_id })
        .andWhere("order.created_at >= :start_date", { start_date })
        .andWhere("order.created_at <= :end_date", { end_date })
        .andWhere("order.status = :status", { status: "DELIVERED" }) // Assuming delivered orders count as revenue
        .getMany();

      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

      // 2. Calculate Expenses (e.g. Salaries)
      const salaryRepo = getRepository(Salary);
      const salaries = await salaryRepo.createQueryBuilder("salary")
        // NOTE: If salary doesn't have company_id directly, we would join employee
        // We will assume expenses could be salaries + other deductions
        .getMany(); // Simplified for MVP

      const totalExpenses = salaries.reduce((sum, s) => sum + Number(s.net_salary || 0), 0);
      
      const netProfit = totalRevenue - totalExpenses;

      // 3. Save as AUTO entry
      const plRepo = getRepository(ProfitLoss);
      const entry = plRepo.create({
        company_id,
        record_date: new Date().toISOString().split('T')[0],
        revenue: totalRevenue,
        expenses: totalExpenses,
        net_profit: netProfit,
        entry_type: "AUTO",
        notes: \`Auto calculated from \${start_date} to \${end_date}\`
      });

      await plRepo.save(entry);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: "P&L auto-calculated successfully.",
        data: entry
      });

    } catch (error) {
      console.error("Auto calc error", error);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to auto-calculate Profit & Loss."
      });
    }
  }

}
