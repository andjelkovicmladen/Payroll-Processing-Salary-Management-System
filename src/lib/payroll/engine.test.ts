import { describe, it, expect } from "vitest";
import { calculatePayroll, calculateProgressiveTax } from "./engine";
import type { PayrollInput, TaxBracket } from "./types";

// A representative simplified tax config used across tests.
const standardTax = {
  brackets: [
    { upToCents: 100_000, rateBps: 1000 }, // first €1,000 @ 10%
    { upToCents: 300_000, rateBps: 2000 }, // €1,000–€3,000 @ 20%
    { upToCents: null, rateBps: 3000 }, // above €3,000 @ 30%
  ] as TaxBracket[],
  employeeContributionBps: 1000, // 10% social security
  employerContributionBps: 1500, // 15% employer cost
  personalAllowanceCents: 20_000, // €200 tax-free
};

function makeInput(overrides: Partial<PayrollInput> = {}): PayrollInput {
  return {
    baseSalaryCents: 300_000, // €3,000
    regularHours: 160,
    overtimeHours: 0,
    standardMonthlyHours: 160,
    overtimeMultiplier: 1.5,
    tax: standardTax,
    ...overrides,
  };
}

describe("calculateProgressiveTax", () => {
  it("returns 0 for non-positive taxable income", () => {
    expect(calculateProgressiveTax(0, standardTax.brackets)).toBe(0);
    expect(calculateProgressiveTax(-500, standardTax.brackets)).toBe(0);
  });

  it("taxes only within the first bracket", () => {
    // €500 @ 10% = €50
    expect(calculateProgressiveTax(50_000, standardTax.brackets)).toBe(5_000);
  });

  it("spans multiple brackets correctly", () => {
    // €2,000 taxable => 1,000@10% (100) + 1,000@20% (200) = €300
    expect(calculateProgressiveTax(200_000, standardTax.brackets)).toBe(30_000);
  });

  it("applies the top open-ended bracket", () => {
    // €5,000 => 100 + 400 + (2,000@30% = 600) = €1,100
    expect(calculateProgressiveTax(500_000, standardTax.brackets)).toBe(
      110_000,
    );
  });

  it("handles a single flat bracket", () => {
    const flat: TaxBracket[] = [{ upToCents: null, rateBps: 1500 }];
    expect(calculateProgressiveTax(100_000, flat)).toBe(15_000);
  });
});

describe("calculatePayroll", () => {
  it("computes a straightforward salary with no overtime", () => {
    const r = calculatePayroll(makeInput());
    expect(r.overtimePayCents).toBe(0);
    expect(r.grossSalaryCents).toBe(300_000);
    // contrib = 10% of 3,000 = 300
    expect(r.employeeContribCents).toBe(30_000);
    // taxable = 3,000 - 300 - 200 = 2,500 => 1,000@10%(100) + 1,500@20%(300) = 400
    expect(r.taxableIncomeCents).toBe(250_000);
    expect(r.incomeTaxCents).toBe(40_000);
    // net = 3,000 - 300 - 400 = 2,300
    expect(r.netSalaryCents).toBe(230_000);
    // employer = 15% of 3,000 = 450
    expect(r.employerContribCents).toBe(45_000);
  });

  it("adds time-and-a-half overtime pay", () => {
    // hourly = 300,000 / 160 = 1,875 cents. 10h OT * 1.5 = 28,125 cents
    const r = calculatePayroll(makeInput({ overtimeHours: 10 }));
    expect(r.overtimePayCents).toBe(28_125);
    expect(r.grossSalaryCents).toBe(328_125);
  });

  it("never produces negative net pay for low earners under allowance", () => {
    const r = calculatePayroll(
      makeInput({ baseSalaryCents: 15_000 }), // €150 < €200 allowance
    );
    expect(r.taxableIncomeCents).toBe(0);
    expect(r.incomeTaxCents).toBe(0);
    expect(r.netSalaryCents).toBeLessThanOrEqual(r.grossSalaryCents);
    expect(r.netSalaryCents).toBeGreaterThan(0);
  });

  it("is deterministic — same input yields identical output", () => {
    const input = makeInput({ overtimeHours: 7 });
    expect(calculatePayroll(input)).toEqual(calculatePayroll(input));
  });

  it("keeps all outputs as integer cents (no float drift)", () => {
    const r = calculatePayroll(makeInput({ overtimeHours: 3.5 }));
    for (const value of Object.values(r)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it("throws on structurally invalid input", () => {
    expect(() =>
      calculatePayroll(makeInput({ standardMonthlyHours: 0 })),
    ).toThrow(/standardMonthlyHours/);
    expect(() =>
      calculatePayroll(makeInput({ baseSalaryCents: -1 })),
    ).toThrow(/baseSalaryCents/);
  });

  it("reconciles: gross = net + tax + employee contributions", () => {
    const r = calculatePayroll(makeInput({ overtimeHours: 12 }));
    expect(
      r.netSalaryCents + r.incomeTaxCents + r.employeeContribCents,
    ).toBe(r.grossSalaryCents);
  });
});
