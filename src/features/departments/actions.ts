"use server";

import { revalidatePath } from "next/cache";
import { handleAction, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/guards";
import {
  createDepartmentSchema,
  departmentService,
  type DepartmentDto,
} from "./index";

export async function listDepartmentsAction(): Promise<
  ActionResult<DepartmentDto[]>
> {
  return handleAction(async () => {
    await requireRole("VIEWER");
    return departmentService.list();
  });
}

export async function createDepartmentAction(
  rawInput: unknown,
): Promise<ActionResult<DepartmentDto>> {
  return handleAction(async () => {
    const user = await requireRole("ADMIN");
    const input = createDepartmentSchema.parse(rawInput);
    const department = await departmentService.create(input, user.id);
    revalidatePath("/dashboard/employees");
    return department;
  });
}
