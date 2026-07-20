import { beforeEach, describe, expect, it, vi } from "vitest";
import { employeeService } from "./service";
import { employeeRepository } from "./repository";
import { ConflictError, NotFoundError } from "@/lib/errors";
import type { CreateEmployeeInput } from "./validation";

vi.mock("./repository", () => ({
  employeeRepository: {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByEmployeeNumber: vi.fn(),
    findAllActive: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    lastEmployeeNumber: vi.fn(),
  },
}));

vi.mock("@/features/audit/audit.service", () => ({
  recordAudit: vi.fn().mockResolvedValue(undefined),
}));

const mockedRepo = vi.mocked(employeeRepository);

const department = {
  id: "dept-1",
  name: "Finance",
  code: "FIN",
  costCenter: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const employeeRow = {
  id: "emp-1",
  employeeNumber: "EMP-0001",
  firstName: "Ana",
  lastName: "Jovanović",
  email: "ana@payroll.local",
  position: "Analyst",
  employmentType: "FULL_TIME",
  employmentDate: new Date("2024-03-01"),
  terminationDate: null,
  baseSalaryCents: 300_000,
  taxCategory: "STANDARD",
  status: "ACTIVE",
  departmentId: department.id,
  department,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const createInput: CreateEmployeeInput = {
  employeeNumber: "EMP-0002",
  firstName: "Marko",
  lastName: "Petrović",
  email: "marko@payroll.local",
  position: "Engineer",
  departmentId: "cjld2cjxh0000qzrmn831i7rn",
  employmentType: "FULL_TIME",
  employmentDate: new Date("2025-01-15"),
  baseSalary: 4200.5,
  taxCategory: "STANDARD",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("employeeService.create", () => {
  it("rejects duplicate emails", async () => {
    mockedRepo.findByEmail.mockResolvedValue(employeeRow as never);

    await expect(
      employeeService.create(createInput, "user-1"),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate employee numbers", async () => {
    mockedRepo.findByEmail.mockResolvedValue(null);
    mockedRepo.findByEmployeeNumber.mockResolvedValue(employeeRow as never);

    await expect(
      employeeService.create(createInput, "user-1"),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("stores the salary as integer cents", async () => {
    mockedRepo.findByEmail.mockResolvedValue(null);
    mockedRepo.findByEmployeeNumber.mockResolvedValue(null);
    mockedRepo.create.mockResolvedValue({
      ...employeeRow,
      baseSalaryCents: 420_050,
    } as never);

    await employeeService.create(createInput, "user-1");

    expect(mockedRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ baseSalaryCents: 420_050 }),
    );
  });
});

describe("employeeService.deactivate", () => {
  it("soft-deactivates with a termination date", async () => {
    mockedRepo.findById.mockResolvedValue(employeeRow as never);
    mockedRepo.update.mockResolvedValue({
      ...employeeRow,
      status: "INACTIVE",
    } as never);

    const result = await employeeService.deactivate("emp-1", "user-1");

    expect(result.status).toBe("INACTIVE");
    expect(mockedRepo.update).toHaveBeenCalledWith(
      "emp-1",
      expect.objectContaining({
        status: "INACTIVE",
        terminationDate: expect.any(Date),
      }),
    );
  });

  it("rejects deactivating an already inactive employee", async () => {
    mockedRepo.findById.mockResolvedValue({
      ...employeeRow,
      status: "INACTIVE",
    } as never);

    await expect(
      employeeService.deactivate("emp-1", "user-1"),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws NotFound for unknown ids", async () => {
    mockedRepo.findById.mockResolvedValue(null);
    await expect(
      employeeService.deactivate("nope", "user-1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("employeeService.suggestEmployeeNumber", () => {
  it("increments the highest existing number", async () => {
    mockedRepo.lastEmployeeNumber.mockResolvedValue("EMP-0017");
    await expect(employeeService.suggestEmployeeNumber()).resolves.toBe(
      "EMP-0018",
    );
  });

  it("starts from 1 when the register is empty", async () => {
    mockedRepo.lastEmployeeNumber.mockResolvedValue(null);
    await expect(employeeService.suggestEmployeeNumber()).resolves.toBe(
      "EMP-0001",
    );
  });
});
