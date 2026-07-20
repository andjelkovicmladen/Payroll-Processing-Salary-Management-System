/**
 * Money utilities.
 *
 * The entire system stores and computes money as INTEGER MINOR UNITS (cents)
 * to avoid IEEE-754 floating point drift, which is unacceptable in payroll.
 * Conversion to a human-readable decimal happens ONLY at the presentation edge.
 */

/** Rounds to the nearest cent using banker's-safe half-up on integers. */
export function roundToCents(value: number): number {
  // Guard against floating artefacts like 0.1 + 0.2 before rounding.
  return Math.round(value + Number.EPSILON);
}

/** Applies a basis-point rate (1% = 100 bps) to a cents amount, rounded. */
export function applyBps(cents: number, bps: number): number {
  return roundToCents((cents * bps) / 10_000);
}

/** Converts a decimal major-unit amount (e.g. 1234.56) to cents (123456). */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Converts cents (123456) to a major-unit number (1234.56). */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Formats a cents value as a localized currency string.
 * Defaults to EUR / en-US grouping; callers may override.
 */
export function formatMoney(
  cents: number,
  options: { currency?: string; locale?: string } = {},
): string {
  const { currency = "EUR", locale = "en-US" } = options;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(fromCents(cents));
}

/** Sums a list of cents values (kept explicit for readability at call sites). */
export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
