import { describe, it, expect } from "vitest";
import {
  applyBps,
  formatMoney,
  fromCents,
  roundToCents,
  sumCents,
  toCents,
} from "./money";

describe("money utilities", () => {
  it("rounds to nearest cent and tames float artefacts", () => {
    expect(roundToCents(100.4)).toBe(100);
    expect(roundToCents(100.5)).toBe(101);
    expect(roundToCents(0.1 + 0.2 - 0.3 + 5)).toBe(5);
  });

  it("applies basis points correctly", () => {
    expect(applyBps(100_000, 1990)).toBe(19_900); // 19.9% of €1,000
    expect(applyBps(300_000, 0)).toBe(0);
  });

  it("round-trips cents and major units", () => {
    expect(toCents(1234.56)).toBe(123_456);
    expect(fromCents(123_456)).toBe(1234.56);
  });

  it("sums cents", () => {
    expect(sumCents([100, 200, 300])).toBe(600);
    expect(sumCents([])).toBe(0);
  });

  it("formats currency", () => {
    expect(formatMoney(123_456, { currency: "EUR" })).toContain("1,234.56");
  });
});
