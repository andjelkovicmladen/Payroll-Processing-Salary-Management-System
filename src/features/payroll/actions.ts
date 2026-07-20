"use server";

import { revalidatePath } from "next/cache";
import { handleAction, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/guards";
import { assertRateLimit } from "@/lib/rate-limit";
import { payrollService } from "./service";
import { processPayrollSchema } from "./validation";
import type { PayrollPeriodDto } from "./dto";

export async function listPayrollPeriodsAction(): Promise<
  ActionResult<PayrollPeriodDto[]>
> {
  return handleAction(async () => {
    await requireRole("VIEWER");
    return payrollService.listPeriods();
  });
}

export async function processPayrollAction(
  rawInput: unknown,
): Promise<ActionResult<PayrollPeriodDto>> {
  return handleAction(async () => {
    const user = await requireRole("ADMIN");
    // Payroll runs are heavyweight; keep the limit tight.
    assertRateLimit(`payroll-run:${user.id}`, { limit: 5, windowMs: 60_000 });
    const input = processPayrollSchema.parse(rawInput);
    const period = await payrollService.processPayroll(input, user.id);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard");
    return period;
  });
}

export async function cancelPayrollAction(
  periodId: string,
): Promise<ActionResult<PayrollPeriodDto>> {
  return handleAction(async () => {
    const user = await requireRole("ADMIN");
    const period = await payrollService.cancelPeriod(periodId, user.id);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard");
    return period;
  });
}

export async function markPayrollPaidAction(
  periodId: string,
): Promise<ActionResult<PayrollPeriodDto>> {
  return handleAction(async () => {
    const user = await requireRole("ADMIN");
    const period = await payrollService.markPaid(periodId, user.id);
    revalidatePath("/dashboard/payroll");
    revalidatePath("/dashboard");
    return period;
  });
}
