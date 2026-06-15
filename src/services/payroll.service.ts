export class PayrollService {

  static calculateSalary(
    monthlySalary: number,
    workingDays: number,
    presentDays: number,
    overtimeHours: number
  ) {

    const perDay =
      monthlySalary / workingDays;

    const salary =
      perDay * presentDays;

    const overtime =
      overtimeHours * 100;

    return {
      salary,
      overtime,
      total:
        salary + overtime
    };
  }
}