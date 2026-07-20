import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EmployeeFilter } from "./validation";
import type { EmployeeWithDepartment } from "./dto";

/**
 * Employee repository — the ONLY module that issues Prisma queries for the
 * Employee aggregate. Services depend on this, never on Prisma directly, so
 * data-access concerns (query shape, pagination) stay in one place.
 */

const withDepartment = { department: true } satisfies Prisma.EmployeeInclude;

export interface EmployeePage {
  items: EmployeeWithDepartment[];
  total: number;
}

export const employeeRepository = {
  async findMany(filter: EmployeeFilter): Promise<EmployeePage> {
    const where: Prisma.EmployeeWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
      ...(filter.search
        ? {
            OR: [
              { firstName: { contains: filter.search, mode: "insensitive" } },
              { lastName: { contains: filter.search, mode: "insensitive" } },
              { email: { contains: filter.search, mode: "insensitive" } },
              {
                employeeNumber: {
                  contains: filter.search,
                  mode: "insensitive",
                },
              },
              { position: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.employee.findMany({
        where,
        include: withDepartment,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.employee.count({ where }),
    ]);

    return { items, total };
  },

  findById(id: string): Promise<EmployeeWithDepartment | null> {
    return prisma.employee.findUnique({
      where: { id },
      include: withDepartment,
    });
  },

  findByEmail(email: string) {
    return prisma.employee.findUnique({ where: { email } });
  },

  findByEmployeeNumber(employeeNumber: string) {
    return prisma.employee.findUnique({ where: { employeeNumber } });
  },

  findAllActive(): Promise<EmployeeWithDepartment[]> {
    return prisma.employee.findMany({
      where: { status: "ACTIVE" },
      include: withDepartment,
      orderBy: [{ lastName: "asc" }],
    });
  },

  create(data: Prisma.EmployeeUncheckedCreateInput) {
    return prisma.employee.create({ data, include: withDepartment });
  },

  update(id: string, data: Prisma.EmployeeUncheckedUpdateInput) {
    return prisma.employee.update({
      where: { id },
      data,
      include: withDepartment,
    });
  },

  count(where?: Prisma.EmployeeWhereInput) {
    return prisma.employee.count({ where });
  },

  /** Highest existing employee number, used to suggest the next one. */
  async lastEmployeeNumber(): Promise<string | null> {
    const last = await prisma.employee.findFirst({
      orderBy: { employeeNumber: "desc" },
      select: { employeeNumber: true },
    });
    return last?.employeeNumber ?? null;
  },
};
