import dataSource from "../config/database";
import { Employee } from "../entities/employee.entity";
import { Attendance, AttendanceStatus, DeductionType } from "../entities/attendance.entity";
import { LeaveRequest } from "../entities/leave.entity";
import { Salary, PayrollStatus } from "../entities/salary";
import { nowDate } from "../utils/dateTime";
import moment from "moment";
import { TenantService } from "../middleware/tenantFilter.middleware";

// ─── Tax Slab (India standard, simplified) ─────────────────────────────────
const TAX_SLABS = [
  { upTo: 250000,  rate: 0 },
  { upTo: 500000,  rate: 0.05 },
  { upTo: 1000000, rate: 0.20 },
  { upTo: Infinity, rate: 0.30 },
];

// ─── Attendance Date Parser ─────────────────────────────────────────────────
// Supports both DD:MM:YYYY (legacy) and YYYY-MM-DD (ISO) formats.
// Returns { month: number (1-12), year: number } or null on failure.
function parseAttendanceDate(dateStr: string): { day: number; month: number; year: number } | null {
  if (!dateStr) return null;

  // DD:MM:YYYY  e.g. "21:07:2026"
  if (/^\d{2}:\d{2}:\d{4}$/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split(":");
    return { day: Number(dd), month: Number(mm), year: Number(yyyy) };
  }

  // YYYY-MM-DD  e.g. "2026-07-21"
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [yyyy, mm, dd] = dateStr.split("-");
    return { day: Number(dd), month: Number(mm), year: Number(yyyy) };
  }

  // DD-MM-YYYY  e.g. "21-07-2026"
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split("-");
    return { day: Number(dd), month: Number(mm), year: Number(yyyy) };
  }

  // DD/MM/YYYY  e.g. "21/07/2026"
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split("/");
    return { day: Number(dd), month: Number(mm), year: Number(yyyy) };
  }

  console.warn(`[PayrollService] Unrecognised attendance_date format: "${dateStr}"`);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYROLL SERVICE
// ═══════════════════════════════════════════════════════════════════════════
export class PayrollService {

  // ─── Generate Monthly Payroll ──────────────────────────────────────────
  async generateMonthlyPayroll(input: {
    employee_id: number;
    month:       string;   // e.g. "July"
    year:        number;
    generated_by: number;
  }): Promise<Salary> {
    const empRepo     = dataSource.getRepository(Employee);
    const attRepo     = dataSource.getRepository(Attendance);
    const leaveRepo   = dataSource.getRepository(LeaveRequest);
    const salaryRepo  = dataSource.getRepository(Salary);

    // ── Validate employee ───────────────────────────────────────────────
    const employee = await empRepo.findOne({ where: { id: input.employee_id } });
    if (!employee) throw new Error("Employee not found");

    // ── Validate salary is configured ───────────────────────────────────
    const basicSalary = Number(employee.salary) || 0;
    if (basicSalary <= 0) {
      throw new Error(`Employee "${employee.name}" has no salary configured. Please set a base salary before generating payroll.`);
    }

    // ── Validate working_hours to prevent division-by-zero ──────────────
    const workingHoursPerDay = Number(employee.working_hours) > 0 ? Number(employee.working_hours) : 8;

    // ── Check for duplicate payroll ─────────────────────────────────────
    const existing = await salaryRepo.findOne({
      where: {
        employee_id: input.employee_id,
        month:       input.month,
        year:        input.year,
      },
    });
    if (existing) throw new Error(`Payroll for ${input.month} ${input.year} already generated for this employee`);

    // ── Month bounds ────────────────────────────────────────────────────
    const monthIndex   = moment().month(input.month).month();
    const startOfMonth = moment({ year: input.year, month: monthIndex, day: 1 });
    const endOfMonth   = startOfMonth.clone().endOf("month");
    const workingDays  = this.countWorkingDays(startOfMonth, endOfMonth);

    // Guard: workingDays should never be zero for a valid month
    if (workingDays <= 0) {
      throw new Error(`Could not compute working days for ${input.month} ${input.year}. Please check the month/year values.`);
    }

    // ── Fetch attendance records ────────────────────────────────────────
    const allAttendance = await attRepo.find({ where: { employee_id: input.employee_id } });

    // Filter to the target month — supports DD:MM:YYYY, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY
    const monthAttendance = allAttendance.filter((a) => {
      const parsed = parseAttendanceDate(a.attendance_date);
      if (!parsed) return false;
      return parsed.month === (monthIndex + 1) && parsed.year === input.year;
    });

    const presentDays     = monthAttendance.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const lateDays        = monthAttendance.filter((a) => a.status === AttendanceStatus.LATE).length;
    const halfDays        = monthAttendance.filter((a) => a.status === AttendanceStatus.HALF_DAY).length;
    const absentDays      = Math.max(0, workingDays - presentDays - lateDays - halfDays);
    const overtimeMinutes = monthAttendance.reduce((s, a) => s + (a.overtime_minutes || 0), 0);

    // ── Approved leaves ─────────────────────────────────────────────────
    const leaves    = await leaveRepo.find({ where: { employee_id: input.employee_id, status: "APPROVED" } });
    const leaveDays = leaves.reduce((s, l) => s + (l.total_days || 0), 0);

    // ── Salary Calculations (safe division) ─────────────────────────────
    const perDaySalary    = basicSalary / workingDays;
    const minutesPerDay   = workingHoursPerDay * 60;
    const perMinuteSalary = minutesPerDay > 0 ? basicSalary / (workingDays * minutesPerDay) : 0;

    // Allowances
    const allowances = {
      hra:       Math.round(basicSalary * 0.40),
      transport: 1600,
      medical:   1250,
      special:   0,
    };
    const totalAllowances = Object.values(allowances).reduce((s, v) => s + v, 0);
    const grossSalary     = basicSalary + totalAllowances;

    // Deductions
    const absentDeduction  = Math.round(perDaySalary * absentDays);
    const halfDayDeduction = Math.round((perDaySalary / 2) * halfDays);

    const breakDeductionMinutes = monthAttendance
      .filter((a) => a.deduction_type === DeductionType.SALARY_DEDUCTION)
      .reduce((s, a) => s + (a.deduction_minutes || 0), 0);
    const breakDeduction = Math.round(perMinuteSalary * breakDeductionMinutes);

    const lateGroups    = Math.floor(lateDays / 3);
    const lateDeduction = Math.round(perDaySalary * 0.5 * lateGroups);

    const annualGross  = grossSalary * 12;
    const taxDeduction = Math.round(this.calculateTax(annualGross) / 12);

    const totalDeductions = absentDeduction + halfDayDeduction + breakDeduction + lateDeduction + taxDeduction;

    const overtimeHours  = overtimeMinutes / 60;
    const overtimeAmount = Math.round(overtimeHours * (perDaySalary / workingHoursPerDay) * 1.5);

    // Ensure netSalary is a valid, non-negative finite number
    const rawNet   = grossSalary - totalDeductions + overtimeAmount;
    const netSalary = isFinite(rawNet) ? Math.max(0, Math.round(rawNet)) : 0;

    const payroll = salaryRepo.create({
      employee_id:        input.employee_id,
      company_id:         employee.company_id,
      branch_id:          employee.branch_id,
      month:              input.month,
      year:               input.year,
      basic_salary:       basicSalary,
      working_days:       workingDays,
      present_days:       presentDays + lateDays,
      absent_days:        absentDays,
      leave_days:         leaveDays,
      half_days:          halfDays,
      late_days:          lateDays,
      overtime_minutes:   overtimeMinutes,
      allowances:         allowances as any,
      total_allowances:   totalAllowances,
      gross_salary:       grossSalary,
      absent_deduction:   absentDeduction,
      half_day_deduction: halfDayDeduction,
      break_deduction:    breakDeduction,
      late_deduction:     lateDeduction,
      tax_deduction:      taxDeduction,
      total_deductions:   totalDeductions,
      overtime_amount:    overtimeAmount,
      net_salary:         netSalary,
      status:             PayrollStatus.DRAFT,
    });

    return salaryRepo.save(payroll);
  }

  async approvePayroll(payrollId: number, approvedBy: number): Promise<Salary> {
    const repo    = dataSource.getRepository(Salary);
    const payroll = await repo.findOne({ where: { id: payrollId } });
    if (!payroll)                               throw new Error("Payroll record not found");
    if (payroll.status !== PayrollStatus.DRAFT) throw new Error("Only DRAFT payroll can be approved");
    payroll.status      = PayrollStatus.APPROVED;
    payroll.approved_by = approvedBy;
    payroll.approved_at = nowDate();
    return repo.save(payroll);
  }

  async markPaid(payrollId: number, input: { payment_method: string; payment_reference: string }): Promise<Salary> {
    const repo    = dataSource.getRepository(Salary);
    const payroll = await repo.findOne({ where: { id: payrollId } });
    if (!payroll)                                   throw new Error("Payroll record not found");
    if (payroll.status !== PayrollStatus.APPROVED)  throw new Error("Payroll must be APPROVED before marking as paid");
    payroll.status            = PayrollStatus.PAID;
    payroll.payment_method    = input.payment_method as any;
    payroll.payment_reference = input.payment_reference;
    payroll.payment_date      = nowDate();
    return repo.save(payroll);
  }

  async getPayslip(payrollId: number, user: any) {
    const repo    = dataSource.getRepository(Salary);
    const empRepo = dataSource.getRepository(Employee);
    const where   = TenantService.scopeWhere(user, { id: payrollId });
    const payroll = await repo.findOne({ where });
    if (!payroll) throw new Error("Payroll record not found");
    const employee = await empRepo.findOne({ where: { id: payroll.employee_id } });
    return { payroll, employee };
  }

  async getMonthlySummary(user: any, month: string, year: number, branchId?: number) {
    const repo  = dataSource.getRepository(Salary);
    const where: any = TenantService.scopeWhere(user, { month, year });
    if (branchId) where.branch_id = branchId;
    const records = await repo.find({ where });
    return {
      total_employees:  records.length,
      total_net_salary: records.reduce((s, r) => s + Number(r.net_salary), 0),
      total_deductions: records.reduce((s, r) => s + Number(r.total_deductions), 0),
      total_overtime:   records.reduce((s, r) => s + Number(r.overtime_amount), 0),
      status_breakdown: {
        draft:    records.filter((r) => r.status === PayrollStatus.DRAFT).length,
        approved: records.filter((r) => r.status === PayrollStatus.APPROVED).length,
        paid:     records.filter((r) => r.status === PayrollStatus.PAID).length,
        rejected: records.filter((r) => r.status === PayrollStatus.REJECTED).length,
      },
      records,
    };
  }

  private countWorkingDays(start: moment.Moment, end: moment.Moment): number {
    let count = 0;
    const cursor = start.clone();
    while (cursor.isSameOrBefore(end, "day")) {
      const day = cursor.day();
      if (day !== 0 && day !== 6) count++;
      cursor.add(1, "day");
    }
    return count;
  }

  private calculateTax(annualIncome: number): number {
    let tax = 0;
    let prev = 0;
    for (const slab of TAX_SLABS) {
      if (annualIncome <= prev) break;
      const taxable = Math.min(annualIncome, slab.upTo) - prev;
      tax  += taxable * slab.rate;
      prev  = slab.upTo;
    }
    return Math.round(tax);
  }
}