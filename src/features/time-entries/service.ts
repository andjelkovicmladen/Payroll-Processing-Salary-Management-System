import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { recordAudit } from "@/features/audit/audit.service";
import { employeeRepository } from "@/features/employees/repository";
import { timeEntryRepository } from "./repository";
import type { TimeEntryFilter, UpsertTimeEntryInput } from "./validation";

/** Row shape consumed by the monthly timesheet grid. */
export interface TimesheetRowDto {
  employeeId: string;
  employeeNumber: string;
  fullName: string;
  department: string;
  regularHours: number;
  overtimeHours: number;
  sickLeaveDays: number;
  vacationDays: number;
  hasEntry: boolean;
}

/**
 * Time-tracking service.
 * Core invariant: timesheets are frozen once the payroll period for that month
 * has been processed — hours feeding a frozen payroll run must not drift.
 */
export const timeEntryService = {
  /**
   * Returns one row per ACTIVE employee for the given month, merged with any
   * existing entries — so the UI can render a complete editable grid.
   */
  async getMonthlyTimesheet(
    filter: TimeEntryFilter,
  ): Promise<TimesheetRowDto[]> {
    const [employees, entries] = await Promise.all([
      employeeRepository.findAllActive(),
      timeEntryRepository.findForPeriod(filter.year, filter.month),
    ]);
    const byEmployee = new Map(entries.map((e) => [e.employeeId, e]));

    return employees.map((emp) => {
      const entry = byEmployee.get(emp.id);
      return {
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        fullName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department.name,
        regularHours: entry?.regularHours ?? 0,
        overtimeHours: entry?.overtimeHours ?? 0,
        sickLeaveDays: entry?.sickLeaveDays ?? 0,
        vacationDays: entry?.vacationDays ?? 0,
        hasEntry: Boolean(entry),
      };
    });
  },

  async upsert(
    input: UpsertTimeEntryInput,
    actorId: string,
  ): Promise<TimesheetRowDto> {
    const employee = await employeeRepository.findById(input.employeeId);
    if (!employee) throw new NotFoundError("Employee", input.employeeId);

    // Frozen-period guard: hours cannot change under a processed payroll.
    const period = await prisma.payrollPeriod.findUnique({
      where: { year_month: { year: input.year, month: input.month } },
    });
    if (period && period.status !== "DRAFT" && period.status !== "CANCELLED") {
      throw new BusinessRuleError(
        `Payroll for ${input.month}/${input.year} is ${period.status.toLowerCase()}; time entries are locked`,
      );
    }

    const saved = await timeEntryRepository.upsert(input);

    await recordAudit({
      action: "UPDATE",
      entity: "TimeEntry",
      entityId: saved.id,
      userId: actorId,
      metadata: {
        employeeId: input.employeeId,
        period: `${input.year}-${input.month}`,
      },
    });

    return {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      fullName: `${employee.firstName} ${employee.lastName}`,
      department: employee.department.name,
      regularHours: saved.regularHours,
      overtimeHours: saved.overtimeHours,
      sickLeaveDays: saved.sickLeaveDays,
      vacationDays: saved.vacationDays,
      hasEntry: true,
    };
  },
};
