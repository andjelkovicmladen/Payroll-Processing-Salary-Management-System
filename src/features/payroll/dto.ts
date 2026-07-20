import type {
  PayrollPeriod,
  PayrollRecord,
  Employee,
  Department,
} from "@prisma/client";
import { fromCents } from "@/lib/money";

/** Payroll DTOs — cents converted to display decimals exactly once, here. */

export interface PayrollPeriodDto {
  id: string;
  year: number;
  month: number;
  /** e.g. "June 2026" */
  label: string;
  status: string;
  notes: string | null;
  processedAt: string | null;
  paidAt: string | null;
  recordCount: number;
  totalGross: number;
  totalNet: number;
  totalTax: number;
  totalEmployerCost: number;
}

export interface PayrollRecordDto {
  id: string;
  periodId: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  department: string;
  position: string;
  regularHours: number;
  overtimeHours: number;
  baseSalary: number;
  overtimePay: number;
  grossSalary: number;
  taxableIncome: number;
  incomeTax: number;
  employeeContrib: number;
  employerContrib: number;
  netSalary: number;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function periodLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

export type PeriodWithRecords = PayrollPeriod & {
  records: PayrollRecord[];
};

export function toPeriodDto(p: PeriodWithRecords): PayrollPeriodDto {
  const sum = (pick: (r: PayrollRecord) => number) =>
    p.records.reduce((acc, r) => acc + pick(r), 0);

  return {
    id: p.id,
    year: p.year,
    month: p.month,
    label: periodLabel(p.year, p.month),
    status: p.status,
    notes: p.notes,
    processedAt: p.processedAt?.toISOString() ?? null,
    paidAt: p.paidAt?.toISOString() ?? null,
    recordCount: p.records.length,
    totalGross: fromCents(sum((r) => r.grossSalaryCents)),
    totalNet: fromCents(sum((r) => r.netSalaryCents)),
    totalTax: fromCents(sum((r) => r.incomeTaxCents)),
    totalEmployerCost: fromCents(
      sum((r) => r.grossSalaryCents + r.employerContribCents),
    ),
  };
}

export type RecordWithEmployee = PayrollRecord & {
  employee: Employee & { department: Department };
};

export function toRecordDto(r: RecordWithEmployee): PayrollRecordDto {
  return {
    id: r.id,
    periodId: r.periodId,
    employeeId: r.employeeId,
    employeeNumber: r.employee.employeeNumber,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
    department: r.employee.department.name,
    position: r.employee.position,
    regularHours: r.regularHours,
    overtimeHours: r.overtimeHours,
    baseSalary: fromCents(r.baseSalaryCents),
    overtimePay: fromCents(r.overtimePayCents),
    grossSalary: fromCents(r.grossSalaryCents),
    taxableIncome: fromCents(r.taxableIncomeCents),
    incomeTax: fromCents(r.incomeTaxCents),
    employeeContrib: fromCents(r.employeeContribCents),
    employerContrib: fromCents(r.employerContribCents),
    netSalary: fromCents(r.netSalaryCents),
  };
}
