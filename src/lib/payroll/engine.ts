import { applyBps, roundToCents } from "@/lib/money";
import type {
  PayrollBreakdown,
  PayrollInput,
  TaxBracket,
} from "./types";

/**
 * PURE PAYROLL ENGINE
 * ───────────────────
 * Given fully-resolved inputs, produce a deterministic, itemized breakdown.
 * No I/O, no dates, no framework. This is the single source of truth for money
 * math and is exhaustively unit-tested (see engine.test.ts).
 *
 * Simplified — but realistic — calculation order:
 *   1. hourlyRate   = baseSalary / standardMonthlyHours
 *   2. overtimePay  = hourlyRate * overtimeHours * overtimeMultiplier
 *   3. gross        = baseSalary + overtimePay
 *   4. employeeContrib = gross * employeeContributionBps        (social security)
 *   5. taxable      = max(0, gross - employeeContrib - personalAllowance)
 *   6. incomeTax    = progressive brackets applied to `taxable`
 *   7. net          = gross - employeeContrib - incomeTax
 *   8. employerContrib = gross * employerContributionBps        (informational)
 */
export function calculatePayroll(input: PayrollInput): PayrollBreakdown {
  validateInput(input);

  const {
    baseSalaryCents,
    overtimeHours,
    standardMonthlyHours,
    overtimeMultiplier,
    tax,
  } = input;

  // 1–2. Overtime pay.
  const hourlyRateCents = baseSalaryCents / standardMonthlyHours;
  const overtimePayCents = roundToCents(
    hourlyRateCents * overtimeHours * overtimeMultiplier,
  );

  // 3. Gross.
  const grossSalaryCents = baseSalaryCents + overtimePayCents;

  // 4. Employee social contributions (levied on gross).
  const employeeContribCents = applyBps(
    grossSalaryCents,
    tax.employeeContributionBps,
  );

  // 5. Taxable income after contributions and personal allowance.
  const taxableIncomeCents = Math.max(
    0,
    grossSalaryCents - employeeContribCents - tax.personalAllowanceCents,
  );

  // 6. Progressive income tax.
  const incomeTaxCents = calculateProgressiveTax(
    taxableIncomeCents,
    tax.brackets,
  );

  // 7. Net pay.
  const netSalaryCents =
    grossSalaryCents - employeeContribCents - incomeTaxCents;

  // 8. Employer contributions (not deducted from net; reported for cost).
  const employerContribCents = applyBps(
    grossSalaryCents,
    tax.employerContributionBps,
  );

  return {
    overtimePayCents,
    grossSalaryCents,
    taxableIncomeCents,
    incomeTaxCents,
    employeeContribCents,
    employerContribCents,
    netSalaryCents,
  };
}

/**
 * Applies an ordered set of progressive brackets to a taxable amount.
 * Each bracket taxes only the portion of income that falls within it.
 */
export function calculateProgressiveTax(
  taxableCents: number,
  brackets: TaxBracket[],
): number {
  if (taxableCents <= 0 || brackets.length === 0) return 0;

  let tax = 0;
  let lowerBound = 0;

  for (const bracket of brackets) {
    const upper = bracket.upToCents ?? Number.POSITIVE_INFINITY;
    if (taxableCents <= lowerBound) break;

    const portion = Math.min(taxableCents, upper) - lowerBound;
    if (portion > 0) {
      tax += applyBps(portion, bracket.rateBps);
    }
    lowerBound = upper;
  }

  return roundToCents(tax);
}

/** Fails fast on structurally invalid input — a defensive guard for the engine. */
function validateInput(input: PayrollInput): void {
  const errors: string[] = [];
  if (input.baseSalaryCents < 0) errors.push("baseSalaryCents must be >= 0");
  if (input.overtimeHours < 0) errors.push("overtimeHours must be >= 0");
  if (input.standardMonthlyHours <= 0)
    errors.push("standardMonthlyHours must be > 0");
  if (input.overtimeMultiplier < 1)
    errors.push("overtimeMultiplier must be >= 1");
  if (!Array.isArray(input.tax.brackets))
    errors.push("tax.brackets must be an array");
  if (errors.length > 0) {
    throw new Error(`Invalid payroll input: ${errors.join("; ")}`);
  }
}
