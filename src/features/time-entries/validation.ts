import { z } from "zod";

/**
 * Validation for monthly timesheets.
 * Bounds are generous but sane: they catch typos (e.g. 1600 hours) without
 * blocking legitimate edge cases.
 */
export const upsertTimeEntrySchema = z.object({
  employeeId: z.string().cuid(),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  regularHours: z.coerce
    .number()
    .min(0, "Regular hours cannot be negative")
    .max(300, "Regular hours cannot exceed 300 per month"),
  overtimeHours: z.coerce
    .number()
    .min(0, "Overtime cannot be negative")
    .max(120, "Overtime cannot exceed 120 hours per month"),
  sickLeaveDays: z.coerce.number().int().min(0).max(31),
  vacationDays: z.coerce.number().int().min(0).max(31),
});

export const timeEntryFilterSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export type UpsertTimeEntryInput = z.infer<typeof upsertTimeEntrySchema>;
export type TimeEntryFilter = z.infer<typeof timeEntryFilterSchema>;
