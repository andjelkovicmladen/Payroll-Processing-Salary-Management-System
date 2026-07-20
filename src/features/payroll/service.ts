import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/lib/errors";
import { calculatePayroll } from "@/lib/payroll/engine";
import { PAYROLL_DEFAULTS, type TaxBracket } from "@/lib/payroll/types";
import { recordAudit } from "@/features/audit/audit.service";
import { payrollRepository } from "./repository";
import {
  periodLabel,
  toPeriodDto,
  toRecordDto,
  type PayrollPeriodDto,
  type PayrollRecordDto,
} from "./dto";
import type { ProcessPayrollInput } from "./validation";

/**
 * Payroll service — orchestrates the monthly payroll run.
 *
 * Workflow invariants:
 *  1. One period per (year, month); processing an already-PROCESSED/PAID
 *     period is rejected (CANCELLED periods may be re-run).
 *  2. Every ACTIVE employee gets exactly one record per run.
 *  3. All inputs (salary, hours, tax params) are SNAPSHOTTED onto the record.
 *  4. The whole run commits atomically — a failure for one employee rolls
 *     back the entire period.
 *  5. State machine: DRAFT → PROCESSED → PAID, with CANCELLED as an exit.
 */
export const payrollService = {
  async listPeriods(): Promise<PayrollPeriodDto[]> {
    const periods = await payrollRepository.findPeriods();
    return periods.map(toPeriodDto);
  },

  async getPeriodDetail(periodId: string): Promise<{
    period: PayrollPeriodDto;
    records: PayrollRecordDto[];
  }> {
    const period = await payrollRepository.findPeriodById(periodId);
    if (!period) throw new NotFoundError("Payroll period", periodId);
    const records = await payrollRepository.findRecordsForPeriod(periodId);
    return {
      period: toPeriodDto(period),
      records: records.map(toRecordDto),
    };
  },

  async getRecordDetail(recordId: string) {
    const record = await payrollRepository.findRecordById(recordId);
    if (!record) throw new NotFoundError("Payroll record", recordId);
    return {
      record: toRecordDto(record),
      period: {
        year: record.period.year,
        month: record.period.month,
        label: periodLabel(record.period.year, record.period.month),
        status: record.period.status,
      },
    };
  },

  async getEmployeeSalaryHistory(employeeId: string) {
    const records = await payrollRepository.findRecordsByEmployee(employeeId);
    return records.map((r) => ({
      recordId: r.id,
      year: r.period.year,
      month: r.period.month,
      label: periodLabel(r.period.year, r.period.month),
      status: r.period.status,
      grossSalary: r.grossSalaryCents / 100,
      netSalary: r.netSalaryCents / 100,
      incomeTax: r.incomeTaxCents / 100,
      overtimeHours: r.overtimeHours,
    }));
  },

  /**
   * Runs payroll for a month: snapshots inputs, calculates every active
   * employee through the pure engine, and commits atomically.
   */
  async processPayroll(
    input: ProcessPayrollInput,
    actorId: string,
  ): Promise<PayrollPeriodDto> {
    const { year, month, notes } = input;

    // Guard: reject re-processing a frozen period.
    const existing = await payrollRepository.findPeriodByYearMonth(year, month);
    if (existing && existing.status !== "CANCELLED") {
      throw new ConflictError(
        `Payroll for ${periodLabel(year, month)} is already ${existing.status.toLowerCase()}`,
      );
    }

    // Load all active employees with their timesheets for the month.
    const employees = await prisma.employee.findMany({
      where: { status: "ACTIVE" },
      include: {
        timeEntries: { where: { year, month } },
      },
    });
    if (employees.length === 0) {
      throw new BusinessRuleError(
        "No active employees found — nothing to process",
      );
    }

    // Resolve tax rules once per distinct category (not per employee).
    const periodDate = new Date(Date.UTC(year, month - 1, 1));
    const categories = [...new Set(employees.map((e) => e.taxCategory))];
    const ruleEntries = await Promise.all(
      categories.map(async (cat) => {
        const rule = await payrollRepository.findEffectiveTaxRule(
          cat,
          periodDate,
        );
        if (!rule) {
          throw new BusinessRuleError(
            `No effective tax rule configured for category ${cat}`,
          );
        }
        return [cat, rule] as const;
      }),
    );
    const rulesByCategory = new Map(ruleEntries);

    // Calculate every employee through the PURE engine before touching the DB.
    const calculations = employees.map((emp) => {
      const entry = emp.timeEntries[0];
      const regularHours =
        entry?.regularHours ?? PAYROLL_DEFAULTS.standardMonthlyHours;
      const overtimeHours = entry?.overtimeHours ?? 0;
      const rule = rulesByCategory.get(emp.taxCategory)!;

      const breakdown = calculatePayroll({
        baseSalaryCents: emp.baseSalaryCents,
        regularHours,
        overtimeHours,
        standardMonthlyHours: PAYROLL_DEFAULTS.standardMonthlyHours,
        overtimeMultiplier: PAYROLL_DEFAULTS.overtimeMultiplier,
        tax: {
          brackets: rule.brackets as unknown as TaxBracket[],
          employeeContributionBps: rule.employeeContributionBps,
          employerContributionBps: rule.employerContributionBps,
          personalAllowanceCents: rule.personalAllowanceCents,
        },
      });

      return {
        employeeId: emp.id,
        baseSalaryCents: emp.baseSalaryCents,
        regularHours,
        overtimeHours,
        taxCategory: emp.taxCategory,
        taxRuleId: rule.id,
        ...breakdown,
      };
    });

    // Atomic commit: period + all records + audit in one transaction.
    const period = await prisma.$transaction(async (tx) => {
      // A CANCELLED period for the same month is replaced.
      if (existing) {
        await tx.payrollRecord.deleteMany({ where: { periodId: existing.id } });
        await tx.payrollPeriod.delete({ where: { id: existing.id } });
      }

      const created = await tx.payrollPeriod.create({
        data: {
          year,
          month,
          status: "PROCESSED",
          notes,
          processedAt: new Date(),
          records: { createMany: { data: calculations } },
        },
        include: { records: true },
      });

      await recordAudit(
        {
          action: "PROCESS_PAYROLL",
          entity: "PayrollPeriod",
          entityId: created.id,
          userId: actorId,
          metadata: {
            period: `${year}-${month}`,
            employees: calculations.length,
            totalGrossCents: calculations.reduce(
              (a, c) => a + c.grossSalaryCents,
              0,
            ),
          },
        },
        tx,
      );

      return created;
    });

    logger.info("Payroll processed", {
      period: `${year}-${month}`,
      records: period.records.length,
      actorId,
    });

    return toPeriodDto(period);
  },

  /** DRAFT/PROCESSED → CANCELLED. PAID runs are immutable. */
  async cancelPeriod(periodId: string, actorId: string) {
    const period = await payrollRepository.findPeriodById(periodId);
    if (!period) throw new NotFoundError("Payroll period", periodId);
    if (period.status === "PAID") {
      throw new BusinessRuleError("A paid payroll run cannot be cancelled");
    }
    if (period.status === "CANCELLED") {
      throw new ConflictError("This payroll run is already cancelled");
    }

    const updated = await prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: "CANCELLED" },
      include: { records: true },
    });

    await recordAudit({
      action: "CANCEL_PAYROLL",
      entity: "PayrollPeriod",
      entityId: periodId,
      userId: actorId,
    });

    return toPeriodDto(updated);
  },

  /** PROCESSED → PAID (disbursement confirmation). */
  async markPaid(periodId: string, actorId: string) {
    const period = await payrollRepository.findPeriodById(periodId);
    if (!period) throw new NotFoundError("Payroll period", periodId);
    if (period.status !== "PROCESSED") {
      throw new BusinessRuleError(
        `Only processed payroll can be marked paid (current: ${period.status})`,
      );
    }

    const updated = await prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: "PAID", paidAt: new Date() },
      include: { records: true },
    });

    await recordAudit({
      action: "MARK_PAID",
      entity: "PayrollPeriod",
      entityId: periodId,
      userId: actorId,
    });

    return toPeriodDto(updated);
  },
};
