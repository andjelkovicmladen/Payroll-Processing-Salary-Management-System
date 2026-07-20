import ExcelJS from "exceljs";
import { NotFoundError } from "@/lib/errors";
import { env } from "@/lib/env";
import { payrollService } from "@/features/payroll/service";
import { employeeService } from "@/features/employees/service";
import { recordAudit } from "@/features/audit/audit.service";
import { reportService } from "./service";

/**
 * Excel report builders (ExcelJS).
 * Each builder returns a styled workbook buffer plus a filename. Common
 * styling (header bands, currency format, totals) is centralized in helpers so
 * all exports look like they came from the same finance department.
 */

const CURRENCY_FMT = '#,##0.00 "€"';
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E2F55" },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 10 };
    cell.alignment = { vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: "FF94A3B8" } } };
  });
  row.height = 20;
}

function addTitleBlock(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  width: number,
) {
  const titleRow = sheet.addRow([title]);
  titleRow.font = { bold: true, size: 14, color: { argb: "FF1E2F55" } };
  sheet.mergeCells(titleRow.number, 1, titleRow.number, width);

  const subRow = sheet.addRow([subtitle]);
  subRow.font = { size: 10, color: { argb: "FF64748B" } };
  sheet.mergeCells(subRow.number, 1, subRow.number, width);

  const metaRow = sheet.addRow([
    `${env.COMPANY_NAME} · generated ${new Date().toISOString().slice(0, 10)}`,
  ]);
  metaRow.font = { size: 9, color: { argb: "FF94A3B8" } };
  sheet.mergeCells(metaRow.number, 1, metaRow.number, width);

  sheet.addRow([]);
}

async function toBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export const excelReportService = {
  /** Full itemized payroll register for one period. */
  async buildPayrollPeriodReport(periodId: string, actorId: string) {
    const { period, records } = await payrollService.getPeriodDetail(periodId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = env.COMPANY_NAME;
    const sheet = workbook.addWorksheet("Payroll register", {
      views: [{ state: "frozen", ySplit: 5 }],
    });

    const columns = [
      { header: "Employee ID", key: "employeeNumber", width: 14 },
      { header: "Employee", key: "employeeName", width: 24 },
      { header: "Department", key: "department", width: 18 },
      { header: "Position", key: "position", width: 22 },
      { header: "Regular h", key: "regularHours", width: 10 },
      { header: "Overtime h", key: "overtimeHours", width: 10 },
      { header: "Base salary", key: "baseSalary", width: 14 },
      { header: "Overtime pay", key: "overtimePay", width: 14 },
      { header: "Gross", key: "grossSalary", width: 14 },
      { header: "Employee contrib.", key: "employeeContrib", width: 16 },
      { header: "Income tax", key: "incomeTax", width: 14 },
      { header: "Net", key: "netSalary", width: 14 },
      { header: "Employer contrib.", key: "employerContrib", width: 16 },
    ];

    addTitleBlock(
      sheet,
      `Payroll Report — ${period.label}`,
      `Status: ${period.status} · ${period.recordCount} employees`,
      columns.length,
    );

    const headerRow = sheet.addRow(columns.map((c) => c.header));
    styleHeaderRow(headerRow);
    columns.forEach((c, i) => {
      sheet.getColumn(i + 1).width = c.width;
    });

    const moneyKeys = new Set([
      "baseSalary", "overtimePay", "grossSalary", "employeeContrib",
      "incomeTax", "netSalary", "employerContrib",
    ]);

    for (const r of records) {
      const row = sheet.addRow(
        columns.map((c) => r[c.key as keyof typeof r] as string | number),
      );
      columns.forEach((c, i) => {
        if (moneyKeys.has(c.key)) row.getCell(i + 1).numFmt = CURRENCY_FMT;
      });
    }

    // Totals row.
    const totals = sheet.addRow([
      "TOTAL", "", "", "", "", "",
      records.reduce((a, r) => a + r.baseSalary, 0),
      records.reduce((a, r) => a + r.overtimePay, 0),
      period.totalGross,
      records.reduce((a, r) => a + r.employeeContrib, 0),
      period.totalTax,
      period.totalNet,
      records.reduce((a, r) => a + r.employerContrib, 0),
    ]);
    totals.font = { bold: true };
    totals.eachCell((cell, col) => {
      if (col >= 7) cell.numFmt = CURRENCY_FMT;
      cell.border = { top: { style: "double", color: { argb: "FF1E2F55" } } };
    });

    await recordAudit({
      action: "EXPORT",
      entity: "PayrollPeriod",
      entityId: periodId,
      userId: actorId,
      metadata: { report: "payroll-period-excel" },
    });

    return {
      buffer: await toBuffer(workbook),
      filename: `payroll_${period.year}-${String(period.month).padStart(2, "0")}.xlsx`,
    };
  },

  /** Department payroll summary for the latest processed period. */
  async buildDepartmentSummaryReport(actorId: string) {
    const breakdown = await reportService.getDepartmentBreakdown();
    if (breakdown.length === 0) {
      throw new NotFoundError("Processed payroll data");
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = env.COMPANY_NAME;
    const sheet = workbook.addWorksheet("Department summary", {
      views: [{ state: "frozen", ySplit: 5 }],
    });

    const columns = [
      { header: "Department", width: 24 },
      { header: "Code", width: 10 },
      { header: "Employees", width: 12 },
      { header: "Total gross", width: 16 },
      { header: "Total net", width: 16 },
      { header: "Average gross", width: 16 },
    ];

    addTitleBlock(
      sheet,
      "Department Payroll Summary",
      "Latest processed payroll period",
      columns.length,
    );

    const headerRow = sheet.addRow(columns.map((c) => c.header));
    styleHeaderRow(headerRow);
    columns.forEach((c, i) => {
      sheet.getColumn(i + 1).width = c.width;
    });

    for (const d of breakdown) {
      const row = sheet.addRow([
        d.department, d.code, d.employees, d.totalGross, d.totalNet, d.averageGross,
      ]);
      [4, 5, 6].forEach((i) => (row.getCell(i).numFmt = CURRENCY_FMT));
    }

    const totals = sheet.addRow([
      "TOTAL",
      "",
      breakdown.reduce((a, d) => a + d.employees, 0),
      breakdown.reduce((a, d) => a + d.totalGross, 0),
      breakdown.reduce((a, d) => a + d.totalNet, 0),
      "",
    ]);
    totals.font = { bold: true };
    [4, 5].forEach((i) => (totals.getCell(i).numFmt = CURRENCY_FMT));
    totals.eachCell((cell) => {
      cell.border = { top: { style: "double", color: { argb: "FF1E2F55" } } };
    });

    await recordAudit({
      action: "EXPORT",
      entity: "Report",
      userId: actorId,
      metadata: { report: "department-summary-excel" },
    });

    return {
      buffer: await toBuffer(workbook),
      filename: "department_payroll_summary.xlsx",
    };
  },

  /** Per-employee salary history across all processed periods. */
  async buildEmployeeHistoryReport(employeeId: string, actorId: string) {
    const employee = await employeeService.getById(employeeId);
    const history = await payrollService.getEmployeeSalaryHistory(employeeId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = env.COMPANY_NAME;
    const sheet = workbook.addWorksheet("Salary history", {
      views: [{ state: "frozen", ySplit: 5 }],
    });

    const columns = [
      { header: "Period", width: 18 },
      { header: "Status", width: 12 },
      { header: "Overtime h", width: 12 },
      { header: "Gross", width: 16 },
      { header: "Income tax", width: 16 },
      { header: "Net", width: 16 },
    ];

    addTitleBlock(
      sheet,
      `Salary History — ${employee.fullName}`,
      `${employee.employeeNumber} · ${employee.position} · ${employee.department.name}`,
      columns.length,
    );

    const headerRow = sheet.addRow(columns.map((c) => c.header));
    styleHeaderRow(headerRow);
    columns.forEach((c, i) => {
      sheet.getColumn(i + 1).width = c.width;
    });

    for (const h of history) {
      const row = sheet.addRow([
        h.label, h.status, h.overtimeHours, h.grossSalary, h.incomeTax, h.netSalary,
      ]);
      [4, 5, 6].forEach((i) => (row.getCell(i).numFmt = CURRENCY_FMT));
    }

    await recordAudit({
      action: "EXPORT",
      entity: "Employee",
      entityId: employeeId,
      userId: actorId,
      metadata: { report: "employee-history-excel" },
    });

    return {
      buffer: await toBuffer(workbook),
      filename: `salary_history_${employee.employeeNumber}.xlsx`,
    };
  },
};
