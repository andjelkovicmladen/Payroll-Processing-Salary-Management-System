import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Data access for payroll periods, records, and tax-rule resolution. */

const recordInclude = {
  employee: { include: { department: true } },
} satisfies Prisma.PayrollRecordInclude;

export const payrollRepository = {
  findPeriods(limit = 24) {
    return prisma.payrollPeriod.findMany({
      include: { records: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: limit,
    });
  },

  findPeriodByYearMonth(year: number, month: number) {
    return prisma.payrollPeriod.findUnique({
      where: { year_month: { year, month } },
      include: { records: true },
    });
  },

  findPeriodById(id: string) {
    return prisma.payrollPeriod.findUnique({
      where: { id },
      include: { records: true },
    });
  },

  findRecordsForPeriod(periodId: string) {
    return prisma.payrollRecord.findMany({
      where: { periodId },
      include: recordInclude,
      orderBy: { employee: { lastName: "asc" } },
    });
  },

  findRecordById(id: string) {
    return prisma.payrollRecord.findUnique({
      where: { id },
      include: {
        ...recordInclude,
        period: true,
      },
    });
  },

  findRecordsByEmployee(employeeId: string) {
    return prisma.payrollRecord.findMany({
      where: { employeeId },
      include: { period: true },
      orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }],
    });
  },

  /**
   * Resolves the tax rule effective for a given category at a point in time.
   * Falls back to the most recent active rule for the category.
   */
  findEffectiveTaxRule(taxCategory: "STANDARD" | "REDUCED" | "EXEMPT", at: Date) {
    return prisma.taxRule.findFirst({
      where: {
        taxCategory,
        isActive: true,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });
  },
};
