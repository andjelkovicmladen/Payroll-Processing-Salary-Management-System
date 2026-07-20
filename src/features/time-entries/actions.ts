"use server";

import { revalidatePath } from "next/cache";
import { handleAction, type ActionResult } from "@/lib/action-result";
import { requireRole } from "@/lib/auth/guards";
import { assertRateLimit } from "@/lib/rate-limit";
import { timeEntryService, type TimesheetRowDto } from "./service";
import { timeEntryFilterSchema, upsertTimeEntrySchema } from "./validation";

export async function getTimesheetAction(
  rawFilter: unknown,
): Promise<ActionResult<TimesheetRowDto[]>> {
  return handleAction(async () => {
    await requireRole("VIEWER");
    const filter = timeEntryFilterSchema.parse(rawFilter);
    return timeEntryService.getMonthlyTimesheet(filter);
  });
}

export async function upsertTimeEntryAction(
  rawInput: unknown,
): Promise<ActionResult<TimesheetRowDto>> {
  return handleAction(async () => {
    const user = await requireRole("HR");
    assertRateLimit(`time-write:${user.id}`, { limit: 60, windowMs: 60_000 });
    const input = upsertTimeEntrySchema.parse(rawInput);
    const row = await timeEntryService.upsert(input, user.id);
    revalidatePath("/dashboard/time-tracking");
    return row;
  });
}
