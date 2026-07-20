/**
 * Database seed script.
 *
 * Creates a realistic starter dataset:
 *   - 3 application users (ADMIN / HR / VIEWER) with hashed passwords
 *   - Tax rules (standard / reduced / exempt)
 *   - Departments
 *   - Employees with monthly time entries
 *   - One fully-processed payroll period so the dashboard has data on first run
 *
 * Idempotent-ish: it upserts reference data and clears transactional data so it
 * can be re-run in development. Run with: `npm run db:seed`.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_TAX_RULES } from "../src/lib/payroll/tax-config";
import { calculatePayroll } from "../src/lib/payroll/engine";
import { PAYROLL_DEFAULTS } from "../src/lib/payroll/types";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // ── Users ────────────────────────────────────────────────────────────────
  const password = await bcrypt.hash("Password123!", 10);
  const users: Array<[string, string, "ADMIN" | "HR" | "VIEWER"]> = [
    ["Admin User", "admin@payroll.local", "ADMIN"],
    ["HR Manager", "hr@payroll.local", "HR"],
    ["Report Viewer", "viewer@payroll.local", "VIEWER"],
  ];
  for (const [name, email, role] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { name, role },
      create: { name, email, role, passwordHash: password },
    });
  }
  console.log("  ✓ users");

  // ── Tax rules ────────────────────────────────────────────────────────────
  await prisma.taxRule.deleteMany();
  for (const rule of DEFAULT_TAX_RULES) {
    await prisma.taxRule.create({
      data: {
        name: rule.name,
        taxCategory: rule.taxCategory,
        brackets: rule.brackets as unknown as Prisma.InputJsonValue,
        employeeContributionBps: rule.employeeContributionBps,
        employerContributionBps: rule.employerContributionBps,
        personalAllowanceCents: rule.personalAllowanceCents,
        effectiveFrom: new Date("2026-01-01"),
        isActive: true,
      },
    });
  }
  console.log("  ✓ tax rules");

  // ── Departments ──────────────────────────────────────────────────────────
  const departmentsData = [
    { name: "Finance", code: "FIN", costCenter: "CC-100" },
    { name: "Engineering", code: "ENG", costCenter: "CC-200" },
    { name: "Human Resources", code: "HR", costCenter: "CC-300" },
    { name: "Sales", code: "SAL", costCenter: "CC-400" },
  ];
  const departments = [];
  for (const d of departmentsData) {
    departments.push(
      await prisma.department.upsert({
        where: { code: d.code },
        update: { name: d.name, costCenter: d.costCenter },
        create: d,
      }),
    );
  }
  console.log("  ✓ departments");

  // ── Employees ────────────────────────────────────────────────────────────
  await prisma.payrollRecord.deleteMany();
  await prisma.payrollPeriod.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.employee.deleteMany();

  const employeeSeeds = [
    ["Ana", "Jovanović", "Finance Analyst", "FIN", 320000, "STANDARD"],
    ["Marko", "Petrović", "Senior Engineer", "ENG", 480000, "STANDARD"],
    ["Ivana", "Nikolić", "HR Specialist", "HR", 280000, "REDUCED"],
    ["Nikola", "Đorđević", "Sales Manager", "SAL", 400000, "STANDARD"],
    ["Jelena", "Stojanović", "Junior Engineer", "ENG", 220000, "STANDARD"],
    ["Stefan", "Ilić", "Accountant", "FIN", 300000, "STANDARD"],
    ["Milica", "Pavlović", "Intern", "ENG", 90000, "EXEMPT"],
    ["Aleksandar", "Marković", "Sales Rep", "SAL", 240000, "STANDARD"],
  ] as const;

  const deptByCode = new Map(departments.map((d) => [d.code, d]));
  const employees = [];
  let n = 1;
  for (const [first, last, position, deptCode, salaryCents, taxCat] of employeeSeeds) {
    const dept = deptByCode.get(deptCode)!;
    const emp = await prisma.employee.create({
      data: {
        employeeNumber: `EMP-${String(n).padStart(4, "0")}`,
        firstName: first,
        lastName: last,
        // ASCII-safe email: đ/Đ are standalone letters (NFD cannot decompose
        // them), so transliterate explicitly before stripping diacritics.
        email: `${first.toLowerCase()}.${last.toLowerCase()}@payroll.local`
          .replace(/đ/g, "d")
          .replace(/Đ/g, "D")
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, ""), // strip combining diacritics
        position,
        employmentType: "FULL_TIME",
        employmentDate: new Date("2024-03-01"),
        baseSalaryCents: salaryCents,
        taxCategory: taxCat,
        status: "ACTIVE",
        departmentId: dept.id,
      },
    });
    employees.push(emp);
    n += 1;
  }
  console.log(`  ✓ ${employees.length} employees`);

  // ── Time entries + a processed payroll period for June 2026 ───────────────
  const year = 2026;
  const month = 6;
  const period = await prisma.payrollPeriod.create({
    data: { year, month, status: "PROCESSED", processedAt: new Date() },
  });

  const taxRules = await prisma.taxRule.findMany();
  const ruleByCategory = new Map(taxRules.map((r) => [r.taxCategory, r]));

  for (const emp of employees) {
    const overtimeHours = Math.floor(Math.random() * 15);
    await prisma.timeEntry.create({
      data: {
        employeeId: emp.id,
        year,
        month,
        regularHours: 160,
        overtimeHours,
        sickLeaveDays: Math.floor(Math.random() * 2),
        vacationDays: Math.floor(Math.random() * 3),
      },
    });

    const rule = ruleByCategory.get(emp.taxCategory)!;
    const breakdown = calculatePayroll({
      baseSalaryCents: emp.baseSalaryCents,
      regularHours: 160,
      overtimeHours,
      standardMonthlyHours: PAYROLL_DEFAULTS.standardMonthlyHours,
      overtimeMultiplier: PAYROLL_DEFAULTS.overtimeMultiplier,
      tax: {
        brackets: rule.brackets as never,
        employeeContributionBps: rule.employeeContributionBps,
        employerContributionBps: rule.employerContributionBps,
        personalAllowanceCents: rule.personalAllowanceCents,
      },
    });

    await prisma.payrollRecord.create({
      data: {
        periodId: period.id,
        employeeId: emp.id,
        baseSalaryCents: emp.baseSalaryCents,
        regularHours: 160,
        overtimeHours,
        taxCategory: emp.taxCategory,
        taxRuleId: rule.id,
        ...breakdown,
      },
    });
  }
  console.log("  ✓ June 2026 payroll processed");

  console.log("✅ Seed complete.\n   Login: admin@payroll.local / Password123!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
