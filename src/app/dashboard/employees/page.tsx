import type { Metadata } from "next";
import { employeeService } from "@/features/employees/service";
import { employeeFilterSchema } from "@/features/employees/validation";
import { departmentService } from "@/features/departments";
import { EmployeesView } from "@/features/employees/components/employees-view";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Employees" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function EmployeesPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const raw = await searchParams;

  // Invalid filter params fall back to defaults rather than crashing the page.
  const parsed = employeeFilterSchema.safeParse(raw);
  const filter = parsed.success
    ? parsed.data
    : employeeFilterSchema.parse({});

  const [data, departments] = await Promise.all([
    employeeService.list(filter),
    departmentService.list(),
  ]);

  const canManage = user.role === "ADMIN" || user.role === "HR";

  return (
    <>
      <PageHeader
        title="Employees"
        description="Manage the employee register, master data, and employment status."
      />
      <EmployeesView
        data={data}
        departments={departments}
        canManage={canManage}
      />
    </>
  );
}
