/**
 * Payroll domain types (pure — no framework or DB dependencies).
 * All monetary amounts are INTEGER MINOR UNITS (cents).
 */

/**
 * A single progressive tax bracket.
 * `upToCents = null` marks the top, open-ended bracket.
 * The portion of taxable income that falls within a bracket is taxed at `rateBps`.
 */
export interface TaxBracket {
  /** Upper bound of this bracket in cents, or null for the top bracket. */
  upToCents: number | null;
  /** Marginal rate in basis points (1% = 100 bps). */
  rateBps: number;
}

/** Fully-resolved tax parameters that apply to one payroll calculation. */
export interface TaxParameters {
  brackets: TaxBracket[];
  /** Employee-side social contribution rate (bps), levied on gross. */
  employeeContributionBps: number;
  /** Employer-side social contribution rate (bps), informational. */
  employerContributionBps: number;
  /** Monthly tax-free personal allowance in cents. */
  personalAllowanceCents: number;
}

/** Inputs required to run a single employee's payroll for one month. */
export interface PayrollInput {
  baseSalaryCents: number;
  regularHours: number;
  overtimeHours: number;
  /** Contractual monthly hours used to derive the hourly rate (e.g. 160). */
  standardMonthlyHours: number;
  /** Overtime premium multiplier (e.g. 1.5 = time-and-a-half). */
  overtimeMultiplier: number;
  tax: TaxParameters;
}

/** Deterministic, fully itemized output of a payroll calculation. */
export interface PayrollBreakdown {
  overtimePayCents: number;
  grossSalaryCents: number;
  /** Gross minus employee contributions minus personal allowance (floored at 0). */
  taxableIncomeCents: number;
  incomeTaxCents: number;
  employeeContribCents: number;
  employerContribCents: number;
  netSalaryCents: number;
}

/** Sensible engine defaults; overridable per run. */
export const PAYROLL_DEFAULTS = {
  standardMonthlyHours: 160,
  overtimeMultiplier: 1.5,
} as const;
