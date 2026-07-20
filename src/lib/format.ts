/**
 * Client-safe display formatters. DTOs deliver money in MAJOR units (decimals)
 * — these helpers only format, they never do arithmetic.
 */

export function formatCurrency(
  amount: number,
  currency = "EUR",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amount,
  );
}

export function formatCompactCurrency(
  amount: number,
  currency = "EUR",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDate(iso: string | Date, locale = "en-GB"): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(iso: string | Date, locale = "en-GB"): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatHours(hours: number): string {
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} h`;
}
