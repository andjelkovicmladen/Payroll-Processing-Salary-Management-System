import { z } from "zod";

export const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const processPayrollSchema = periodSchema.extend({
  notes: z.string().trim().max(500).optional(),
});

export type PeriodInput = z.infer<typeof periodSchema>;
export type ProcessPayrollInput = z.infer<typeof processPayrollSchema>;
