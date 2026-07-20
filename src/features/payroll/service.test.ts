import { beforeEach, describe, expect, it, vi } from "vitest";
import { payrollService } from "./service";
import { payrollRepository } from "./repository";
import { prisma } from "@/lib/prisma";
import { BusinessRuleError, ConflictError } from "@/lib/errors";

/**
 * Payroll service tests — the state machine and orchestration logic, with all
 * I/O mocked. The money math itself is covered by the engine test suite.
 */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    employee: { findMany: vi.fn() },
    payrollPeriod: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("./repository", () => ({
  payrollRepository: {
    findPeriods: vi.fn(),
    findPeriodByYearMonth: vi.fn(),
    findPeriodById: vi.fn(),
    findRecordsForPeriod: vi.fn(),
    findRecordById: vi.fn(),
    findRecordsByEmployee: vi.fn(),
    findEffectiveTaxRule: vi.fn(),
  },
}));

vi.mock("@/features/audit/audit.service", () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

const mockedRepo = vi.mocked(payrollRepository);
const mockedPrisma = vi.mocked(prisma, true);

const taxRule = {
  id: "rule-1",
  brackets: [{ upToCents: null, rateBps: 1000 }],
  employeeContributionBps: 1000,
  employerContributionBps: 1500,
  personalAllowanceCents: 0,
};

const activeEmployee = {
  id: "emp-1",
  baseSalaryCents: 300_000,
  taxCategory: "STANDARD" as const,
  timeEntries: [
    { regularHours: 160, overtimeHours: 10 },
  ],
};

function periodRow(status: string) {
  return {
    id: "period-1",
    year: 2026,
    month: 7,
    status,
    notes: null,
    processedAt: null,
    paidAt: null,
    records: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("payrollService.processPayroll", () => {
  it("rejects re-processing an already processed period", async () => {
    mockedRepo.findPeriodByYearMonth.mockResolvedValue(
      periodRow("PROCESSED") as never,
    );

    await expect(
      payrollService.processPayroll({ year: 2026, month: 7 }, "user-1"),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("fails when there are no active employees", async () => {
    mockedRepo.findPeriodByYearMonth.mockResolvedValue(null);
    mockedPrisma.employee.findMany.mockResolvedValue([] as never);

    await expect(
      payrollService.processPayroll({ year: 2026, month: 7 }, "user-1"),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it("fails when no tax rule covers an employee's category", async () => {
    mockedRepo.findPeriodByYearMonth.mockResolvedValue(null);
    mockedPrisma.employee.findMany.mockResolvedValue([activeEmployee] as never);
    mockedRepo.findEffectiveTaxRule.mockResolvedValue(null);

    await expect(
      payrollService.processPayroll({ year: 2026, month: 7 }, "user-1"),
    ).rejects.toThrow(/No effective tax rule/);
  });

  it("processes payroll atomically and snapshots engine outputs", async () => {
    mockedRepo.findPeriodByYearMonth.mockResolvedValue(null);
    mockedPrisma.employee.findMany.mockResolvedValue([activeEmployee] as never);
    mockedRepo.findEffectiveTaxRule.mockResolvedValue(taxRule as never);

    let createdData: Record<string, unknown> | null = null;
    const txPeriod = {
      ...periodRow("PROCESSED"),
      records: [
        {
          grossSalaryCents: 328_125,
          netSalaryCents: 265_782,
          incomeTaxCents: 29_531,
          employeeContribCents: 32_812,
          employerContribCents: 49_219,
        },
      ],
    };

    mockedPrisma.$transaction.mockImplementation(async (fn: unknown) => {
      const tx = {
        payrollRecord: { deleteMany: vi.fn() },
        payrollPeriod: {
          delete: vi.fn(),
          create: vi.fn().mockImplementation(({ data }) => {
            createdData = data;
            return Promise.resolve(txPeriod);
          }),
        },
        auditLog: { create: vi.fn() },
      };
      return (fn as (tx: unknown) => Promise<unknown>)(tx);
    });

    const result = await payrollService.processPayroll(
      { year: 2026, month: 7 },
      "user-1",
    );

    // The period was created with one calculated record per employee.
    expect(createdData).not.toBeNull();
    const records = (
      createdData as unknown as {
        records: { createMany: { data: Array<Record<string, number | string>> } };
      }
    ).records.createMany.data;
    expect(records).toHaveLength(1);

    const record = records[0]!;
    // Inputs snapshotted:
    expect(record.baseSalaryCents).toBe(300_000);
    expect(record.overtimeHours).toBe(10);
    expect(record.taxRuleId).toBe("rule-1");
    // Engine outputs present and integral:
    expect(record.grossSalaryCents).toBe(328_125); // base + 10h OT @1.5×
    expect(Number.isInteger(record.netSalaryCents)).toBe(true);

    // DTO aggregation over records:
    expect(result.status).toBe("PROCESSED");
    expect(result.recordCount).toBe(1);
  });
});

describe("payroll state machine", () => {
  it("markPaid only accepts PROCESSED periods", async () => {
    mockedRepo.findPeriodById.mockResolvedValue(periodRow("DRAFT") as never);
    await expect(
      payrollService.markPaid("period-1", "user-1"),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it("markPaid transitions PROCESSED → PAID", async () => {
    mockedRepo.findPeriodById.mockResolvedValue(
      periodRow("PROCESSED") as never,
    );
    mockedPrisma.payrollPeriod.update.mockResolvedValue(
      periodRow("PAID") as never,
    );

    const result = await payrollService.markPaid("period-1", "user-1");
    expect(result.status).toBe("PAID");
    expect(mockedPrisma.payrollPeriod.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PAID" }),
      }),
    );
  });

  it("cancelPeriod refuses PAID periods", async () => {
    mockedRepo.findPeriodById.mockResolvedValue(periodRow("PAID") as never);
    await expect(
      payrollService.cancelPeriod("period-1", "user-1"),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it("cancelPeriod refuses double cancellation", async () => {
    mockedRepo.findPeriodById.mockResolvedValue(
      periodRow("CANCELLED") as never,
    );
    await expect(
      payrollService.cancelPeriod("period-1", "user-1"),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
