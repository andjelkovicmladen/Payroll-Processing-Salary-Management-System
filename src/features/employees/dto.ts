import type { Employee, Department } from "@prisma/client";
import { fromCents } from "@/lib/money";

/**
 * Employee DTOs — the shapes the UI consumes.
 * Prisma entities never cross the server/client boundary directly; DTOs strip
 * internals and convert cents to display-ready decimals exactly once.
 */

export interface EmployeeDto {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  position: string;
  employmentType: string;
  employmentDate: string; // ISO date
  baseSalary: number; // major units for display
  baseSalaryCents: number; // kept for exact re-editing
  taxCategory: string;
  status: string;
  department: {
    id: string;
    name: string;
    code: string;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type EmployeeWithDepartment = Employee & { department: Department };

export function toEmployeeDto(e: EmployeeWithDepartment): EmployeeDto {
  return {
    id: e.id,
    employeeNumber: e.employeeNumber,
    firstName: e.firstName,
    lastName: e.lastName,
    fullName: `${e.firstName} ${e.lastName}`,
    email: e.email,
    position: e.position,
    employmentType: e.employmentType,
    employmentDate: e.employmentDate.toISOString(),
    baseSalary: fromCents(e.baseSalaryCents),
    baseSalaryCents: e.baseSalaryCents,
    taxCategory: e.taxCategory,
    status: e.status,
    department: {
      id: e.department.id,
      name: e.department.name,
      code: e.department.code,
    },
  };
}
