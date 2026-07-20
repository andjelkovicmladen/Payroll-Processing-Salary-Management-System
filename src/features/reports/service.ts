import { prisma } from "@/lib/prisma";
import { fromCents } from "@/lib/money";
import { periodLabel } from "@/features/payroll/dto";

/**
 * Reporting service — read-only aggregations for the dashboard and exports.
 * Aggregation happens in SQL (Prisma groupBy/aggregate) wherever possible;
 * cents→decimal conversion happens at the DTO edge as everywhere else.
 */

export interface DashboardStatsDto {
  totalEmployees: number;
  activeEmployees: number;
  departmentCount: number;
  latestPeriodLabel: string | null;
  monthlyPayrollCost: number; // gross + employer contributions
  totalNetPaid: number;
  averageGrossSalary: number;
}

export interface PayrollTrendPointDto {
  label: string; // "Jun 26"
  gross: number;
  net: number;
  tax: number;
  employerCost: number;
}

export interface DepartmentBreakdownDto {
  department: string;
  code: string;
  employees: number;
  totalGross: number;
  totalNet: number;
  averageGross: number;
}

export interface RecentRunDto {
  id: string;
  label: string;
  status: string;
  employees: number;
  totalNet: number;
  processedAt: string | null;
}

const REPORTABLE = ["PROCESSED", "PAID"] as const;

export const reportService = {
  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [totalEmployees, activeEmployees, departmentCount, latestPeriod] =
      await Promise.all([
        prisma.employee.count(),
        prisma.employee.count({ where: { status: "ACTIVE" } }),
        prisma.department.count(),
        prisma.payrollPeriod.findFirst({
          where: { status: { in: [...REPORTABLE] } },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        }),
      ]);

    let monthlyPayrollCost = 0;
    let totalNetPaid = 0;
    let averageGrossSalary = 0;

    if (latestPeriod) {
      const agg = await prisma.payrollRecord.aggregate({
        where: { periodId: latestPeriod.id },
        _sum: {
          grossSalaryCents: true,
          employerContribCents: true,
          netSalaryCents: true,
        },
        _avg: { grossSalaryCents: true },
      });
      monthlyPayrollCost = fromCents(
        (agg._sum.grossSalaryCents ?? 0) + (agg._sum.employerContribCents ?? 0),
      );
      totalNetPaid = fromCents(agg._sum.netSalaryCents ?? 0);
      averageGrossSalary = fromCents(
        Math.round(agg._avg.grossSalaryCents ?? 0),
      );
    }

    return {
      totalEmployees,
      activeEmployees,
      departmentCount,
      latestPeriodLabel: latestPeriod
        ? periodLabel(latestPeriod.year, latestPeriod.month)
        : null,
      monthlyPayrollCost,
      totalNetPaid,
      averageGrossSalary,
    };
  },

  /** Last N processed periods, oldest→newest, for the trend chart. */
  async getPayrollTrend(limit = 12): Promise<PayrollTrendPointDto[]> {
    const periods = await prisma.payrollPeriod.findMany({
      where: { status: { in: [...REPORTABLE] } },
      include: { records: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: limit,
    });

    return periods.reverse().map((p) => {
      const sum = (pick: (r: (typeof p.records)[number]) => number) =>
        p.records.reduce((acc, r) => acc + pick(r), 0);
      const shortLabel = `${periodLabel(p.year, p.month).slice(0, 3)} ${String(p.year).slice(2)}`;
      return {
        label: shortLabel,
        gross: fromCents(sum((r) => r.grossSalaryCents)),
        net: fromCents(sum((r) => r.netSalaryCents)),
        tax: fromCents(sum((r) => r.incomeTaxCents)),
        employerCost: fromCents(
          sum((r) => r.grossSalaryCents + r.employerContribCents),
        ),
      };
    });
  },

  /** Payroll totals per department for the latest processed period. */
  async getDepartmentBreakdown(): Promise<DepartmentBreakdownDto[]> {
    const latest = await prisma.payrollPeriod.findFirst({
      where: { status: { in: [...REPORTABLE] } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    if (!latest) return [];

    const records = await prisma.payrollRecord.findMany({
      where: { periodId: latest.id },
      include: { employee: { include: { department: true } } },
    });

    const byDept = new Map<
      string,
      { code: string; employees: number; gross: number; net: number }
    >();
    for (const r of records) {
      const dept = r.employee.department;
      const cur = byDept.get(dept.name) ?? {
        code: dept.code,
        employees: 0,
        gross: 0,
        net: 0,
      };
      cur.employees += 1;
      cur.gross += r.grossSalaryCents;
      cur.net += r.netSalaryCents;
      byDept.set(dept.name, cur);
    }

    return [...byDept.entries()]
      .map(([department, v]) => ({
        department,
        code: v.code,
        employees: v.employees,
        totalGross: fromCents(v.gross),
        totalNet: fromCents(v.net),
        averageGross: fromCents(Math.round(v.gross / v.employees)),
      }))
      .sort((a, b) => b.totalGross - a.totalGross);
  },

  async getRecentRuns(limit = 5): Promise<RecentRunDto[]> {
    const periods = await prisma.payrollPeriod.findMany({
      include: { records: true },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: limit,
    });
    return periods.map((p) => ({
      id: p.id,
      label: periodLabel(p.year, p.month),
      status: p.status,
      employees: p.records.length,
      totalNet: fromCents(
        p.records.reduce((acc, r) => acc + r.netSalaryCents, 0),
      ),
      processedAt: p.processedAt?.toISOString() ?? null,
    }));
  },
};
