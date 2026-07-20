"use server";

import { revalidatePath } from "next/cache";
import { handleAction, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/guards";
import { assertRateLimit } from "@/lib/rate-limit";
import { employeeService } from "./service";
import {
  createEmployeeSchema,
  employeeFilterSchema,
  updateEmployeeSchema,
} from "./validation";
import type { EmployeeDto, PaginatedResult } from "./dto";

/**
 * Employee Server Actions — thin, uniform boundary:
 *   authorize → rate-limit → validate → delegate to service → revalidate.
 * No business logic lives here.
 */

export async function listEmployeesAction(
  rawFilter: unknown,
): Promise<ActionResult<PaginatedResult<EmployeeDto>>> {
  return handleAction(async () => {
    await requireRole("VIEWER");
    const filter = employeeFilterSchema.parse(rawFilter ?? {});
    return employeeService.list(filter);
  });
}

export async function getEmployeeAction(
  id: string,
): Promise<ActionResult<EmployeeDto>> {
  return handleAction(async () => {
    await requireRole("VIEWER");
    return employeeService.getById(id);
  });
}

export async function createEmployeeAction(
  rawInput: unknown,
): Promise<ActionResult<EmployeeDto>> {
  return handleAction(async () => {
    const user = await requireRole("HR");
    assertRateLimit(`employee-write:${user.id}`, {
      limit: 30,
      windowMs: 60_000,
    });
    const input = createEmployeeSchema.parse(rawInput);
    const employee = await employeeService.create(input, user.id);
    revalidatePath("/dashboard/employees");
    return employee;
  });
}

export async function updateEmployeeAction(
  rawInput: unknown,
): Promise<ActionResult<EmployeeDto>> {
  return handleAction(async () => {
    const user = await requireRole("HR");
    assertRateLimit(`employee-write:${user.id}`, {
      limit: 30,
      windowMs: 60_000,
    });
    const input = updateEmployeeSchema.parse(rawInput);
    const employee = await employeeService.update(input, user.id);
    revalidatePath("/dashboard/employees");
    return employee;
  });
}

export async function deactivateEmployeeAction(
  id: string,
): Promise<ActionResult<EmployeeDto>> {
  return handleAction(async () => {
    const user = await requireRole("HR");
    const employee = await employeeService.deactivate(id, user.id);
    revalidatePath("/dashboard/employees");
    return employee;
  });
}

export async function reactivateEmployeeAction(
  id: string,
): Promise<ActionResult<EmployeeDto>> {
  return handleAction(async () => {
    const user = await requireRole("HR");
    const employee = await employeeService.reactivate(id, user.id);
    revalidatePath("/dashboard/employees");
    return employee;
  });
}

export async function suggestEmployeeNumberAction(): Promise<
  ActionResult<string>
> {
  return handleAction(async () => {
    await requireRole("HR");
    return employeeService.suggestEmployeeNumber();
  });
}
