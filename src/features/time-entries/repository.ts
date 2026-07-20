import { prisma } from "@/lib/prisma";
import type { UpsertTimeEntryInput } from "./validation";

/** Data access for monthly timesheets. */
export const timeEntryRepository = {
  findForPeriod(year: number, month: number) {
    return prisma.timeEntry.findMany({
      where: { year, month },
      include: {
        employee: { include: { department: true } },
      },
      orderBy: { employee: { lastName: "asc" } },
    });
  },

  findByEmployeeAndPeriod(employeeId: string, year: number, month: number) {
    return prisma.timeEntry.findUnique({
      where: { employeeId_year_month: { employeeId, year, month } },
    });
  },

  upsert(input: UpsertTimeEntryInput) {
    const { employeeId, year, month, ...hours } = input;
    return prisma.timeEntry.upsert({
      where: { employeeId_year_month: { employeeId, year, month } },
      update: hours,
      create: { employeeId, year, month, ...hours },
    });
  },
};
