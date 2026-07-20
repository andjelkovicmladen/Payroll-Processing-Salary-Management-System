import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ConflictError } from "@/lib/errors";
import { recordAudit } from "@/features/audit/audit.service";

/**
 * Department feature (compact module: validation + dto + repository + service).
 * Kept in one file because the aggregate is small; splitting further would be
 * ceremony without benefit. The layering is still respected internally.
 */

// ── Validation ──────────────────────────────────────────────────────────────
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9-]+$/, "Code must be uppercase letters/digits"),
  costCenter: z.string().trim().max(20).optional(),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

// ── DTO ─────────────────────────────────────────────────────────────────────
export interface DepartmentDto {
  id: string;
  name: string;
  code: string;
  costCenter: string | null;
  employeeCount: number;
}

// ── Repository ──────────────────────────────────────────────────────────────
const departmentRepository = {
  findAllWithCounts() {
    return prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    });
  },
  findByCode(code: string) {
    return prisma.department.findUnique({ where: { code } });
  },
  create(data: CreateDepartmentInput) {
    return prisma.department.create({
      data,
      include: { _count: { select: { employees: true } } },
    });
  },
};

// ── Service ─────────────────────────────────────────────────────────────────
export const departmentService = {
  async list(): Promise<DepartmentDto[]> {
    const rows = await departmentRepository.findAllWithCounts();
    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      costCenter: d.costCenter,
      employeeCount: d._count.employees,
    }));
  },

  async create(
    input: CreateDepartmentInput,
    actorId: string,
  ): Promise<DepartmentDto> {
    if (await departmentRepository.findByCode(input.code)) {
      throw new ConflictError(`Department code ${input.code} already exists`);
    }
    const created = await departmentRepository.create(input);
    await recordAudit({
      action: "CREATE",
      entity: "Department",
      entityId: created.id,
      userId: actorId,
      metadata: { code: created.code },
    });
    return {
      id: created.id,
      name: created.name,
      code: created.code,
      costCenter: created.costCenter,
      employeeCount: created._count.employees,
    };
  },
};
