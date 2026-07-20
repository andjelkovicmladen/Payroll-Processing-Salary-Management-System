import type { TaxBracket } from "./types";

/**
 * Default, simplified tax configuration seeded into the TaxRule table.
 * Loosely inspired by a European progressive model but intentionally simplified
 * for a portfolio project. Rates are in basis points (1% = 100 bps); money in
 * cents. These constants are the seed source of truth — runtime resolves the
 * effective TaxRule row from the DB, not these constants directly.
 */

export interface TaxRuleSeed {
  name: string;
  taxCategory: "STANDARD" | "REDUCED" | "EXEMPT";
  brackets: TaxBracket[];
  employeeContributionBps: number;
  employerContributionBps: number;
  personalAllowanceCents: number;
}

export const DEFAULT_TAX_RULES: TaxRuleSeed[] = [
  {
    name: "Standard progressive tax 2026",
    taxCategory: "STANDARD",
    brackets: [
      { upToCents: 150_000, rateBps: 1000 }, // up to €1,500 @ 10%
      { upToCents: 400_000, rateBps: 2000 }, // €1,500–€4,000 @ 20%
      { upToCents: null, rateBps: 3000 }, // above €4,000 @ 30%
    ],
    employeeContributionBps: 1990, // 19.9% social security (employee)
    employerContributionBps: 1765, // 17.65% social security (employer)
    personalAllowanceCents: 25_000, // €250 tax-free
  },
  {
    name: "Reduced tax (relief) 2026",
    taxCategory: "REDUCED",
    brackets: [
      { upToCents: 200_000, rateBps: 500 }, // up to €2,000 @ 5%
      { upToCents: null, rateBps: 1500 }, // above @ 15%
    ],
    employeeContributionBps: 1990,
    employerContributionBps: 1765,
    personalAllowanceCents: 40_000, // €400 tax-free
  },
  {
    name: "Exempt (interns/trainees) 2026",
    taxCategory: "EXEMPT",
    brackets: [{ upToCents: null, rateBps: 0 }],
    employeeContributionBps: 0,
    employerContributionBps: 0,
    personalAllowanceCents: 0,
  },
];
