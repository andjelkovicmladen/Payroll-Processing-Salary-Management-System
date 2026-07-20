import { z } from "zod";

/**
 * Validation layer for the Employee feature.
 * Zod schemas are the single source of truth for input shape; DTO types are
 * inferred from them so validation and typing never drift apart.
 *
 * Note: the UI collects salary as a decimal (e.g. 3000.00); we validate and
 * transform to integer cents here so nothing downstream ever sees a float.
 */

export const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT"] as const;
export const TAX_CATEGORIES = ["STANDARD", "REDUCED", "EXEMPT"] as const;
export const EMPLOYEE_STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE"] as const;

export const createEmployeeSchema = z.object({
  employeeNumber: z
    .string()
    .trim()
    .min(1, "Employee number is required")
    .max(20),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("A valid email is required"),
  position: z.string().trim().min(1, "Position is required").max(120),
  departmentId: z.string().cuid("A department must be selected"),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  employmentDate: z.coerce.date({ message: "Employment date is required" }),
  // Major-unit decimal from the form; must be positive and sane.
  baseSalary: z.coerce
    .number()
    .positive("Base salary must be greater than 0")
    .max(10_000_000, "Base salary is unrealistically high"),
  taxCategory: z.enum(TAX_CATEGORIES),
});

export const updateEmployeeSchema = createEmployeeSchema
  .partial()
  .extend({ id: z.string().cuid() });

export const employeeFilterSchema = z.object({
  search: z.string().trim().optional(),
  departmentId: z.string().cuid().optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type EmployeeFilter = z.infer<typeof employeeFilterSchema>;
