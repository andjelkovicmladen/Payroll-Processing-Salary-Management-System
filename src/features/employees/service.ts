import { toCents } from "@/lib/money";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { recordAudit } from "@/features/audit/audit.service";
import { employeeRepository } from "./repository";
import { toEmployeeDto, type EmployeeDto, type PaginatedResult } from "./dto";
import type {
  CreateEmployeeInput,
  EmployeeFilter,
  UpdateEmployeeInput,
} from "./validation";

/**
 * Employee service — business rules for the employee lifecycle.
 * Actions authenticate/authorize; this layer enforces domain invariants:
 *  - unique email & employee number
 *  - soft deactivation only (payroll history must survive)
 *  - salary handled as cents from the boundary inward
 */
export const employeeService = {
  async list(filter: EmployeeFilter): Promise<PaginatedResult<EmployeeDto>> {
    const { items, total } = await employeeRepository.findMany(filter);
    return {
      items: items.map(toEmployeeDto),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
      totalPages: Math.max(1, Math.ceil(total / filter.pageSize)),
    };
  },

  async getById(id: string): Promise<EmployeeDto> {
    const employee = await employeeRepository.findById(id);
    if (!employee) throw new NotFoundError("Employee", id);
    return toEmployeeDto(employee);
  },

  async create(
    input: CreateEmployeeInput,
    actorId: string,
  ): Promise<EmployeeDto> {
    if (await employeeRepository.findByEmail(input.email)) {
      throw new ConflictError(
        `An employee with email ${input.email} already exists`,
      );
    }
    if (
      await employeeRepository.findByEmployeeNumber(input.employeeNumber)
    ) {
      throw new ConflictError(
        `Employee number ${input.employeeNumber} is already in use`,
      );
    }

    const created = await employeeRepository.create({
      employeeNumber: input.employeeNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      position: input.position,
      departmentId: input.departmentId,
      employmentType: input.employmentType,
      employmentDate: input.employmentDate,
      baseSalaryCents: toCents(input.baseSalary),
      taxCategory: input.taxCategory,
      status: "ACTIVE",
    });

    await recordAudit({
      action: "CREATE",
      entity: "Employee",
      entityId: created.id,
      userId: actorId,
      metadata: { employeeNumber: created.employeeNumber },
    });

    return toEmployeeDto(created);
  },

  async update(
    input: UpdateEmployeeInput,
    actorId: string,
  ): Promise<EmployeeDto> {
    const existing = await employeeRepository.findById(input.id);
    if (!existing) throw new NotFoundError("Employee", input.id);

    // Uniqueness checks only when the value actually changes.
    if (input.email && input.email !== existing.email) {
      if (await employeeRepository.findByEmail(input.email)) {
        throw new ConflictError(
          `An employee with email ${input.email} already exists`,
        );
      }
    }
    if (
      input.employeeNumber &&
      input.employeeNumber !== existing.employeeNumber
    ) {
      if (
        await employeeRepository.findByEmployeeNumber(input.employeeNumber)
      ) {
        throw new ConflictError(
          `Employee number ${input.employeeNumber} is already in use`,
        );
      }
    }

    const updated = await employeeRepository.update(input.id, {
      ...(input.employeeNumber ? { employeeNumber: input.employeeNumber } : {}),
      ...(input.firstName ? { firstName: input.firstName } : {}),
      ...(input.lastName ? { lastName: input.lastName } : {}),
      ...(input.email ? { email: input.email } : {}),
      ...(input.position ? { position: input.position } : {}),
      ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      ...(input.employmentType ? { employmentType: input.employmentType } : {}),
      ...(input.employmentDate ? { employmentDate: input.employmentDate } : {}),
      ...(input.baseSalary !== undefined
        ? { baseSalaryCents: toCents(input.baseSalary) }
        : {}),
      ...(input.taxCategory ? { taxCategory: input.taxCategory } : {}),
    });

    await recordAudit({
      action: "UPDATE",
      entity: "Employee",
      entityId: updated.id,
      userId: actorId,
      metadata: { fields: Object.keys(input).filter((k) => k !== "id") },
    });

    return toEmployeeDto(updated);
  },

  /**
   * Soft-deactivates an employee. Hard deletes are intentionally unsupported:
   * historical payroll records reference the employee and must remain intact.
   */
  async deactivate(id: string, actorId: string): Promise<EmployeeDto> {
    const existing = await employeeRepository.findById(id);
    if (!existing) throw new NotFoundError("Employee", id);
    if (existing.status === "INACTIVE") {
      throw new ConflictError("Employee is already inactive");
    }

    const updated = await employeeRepository.update(id, {
      status: "INACTIVE",
      terminationDate: new Date(),
    });

    await recordAudit({
      action: "DEACTIVATE",
      entity: "Employee",
      entityId: id,
      userId: actorId,
    });

    return toEmployeeDto(updated);
  },

  /** Reactivate a previously deactivated employee. */
  async reactivate(id: string, actorId: string): Promise<EmployeeDto> {
    const existing = await employeeRepository.findById(id);
    if (!existing) throw new NotFoundError("Employee", id);
    if (existing.status === "ACTIVE") {
      throw new ConflictError("Employee is already active");
    }

    const updated = await employeeRepository.update(id, {
      status: "ACTIVE",
      terminationDate: null,
    });

    await recordAudit({
      action: "UPDATE",
      entity: "Employee",
      entityId: id,
      userId: actorId,
      metadata: { reactivated: true },
    });

    return toEmployeeDto(updated);
  },

  /** Suggests the next sequential employee number, e.g. "EMP-0009". */
  async suggestEmployeeNumber(): Promise<string> {
    const last = await employeeRepository.lastEmployeeNumber();
    const lastN = last ? parseInt(last.replace(/\D/g, ""), 10) : 0;
    const next = Number.isNaN(lastN) ? 1 : lastN + 1;
    return `EMP-${String(next).padStart(4, "0")}`;
  },
};
