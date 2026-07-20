import type { Metadata } from "next";
import { payrollService } from "@/features/payroll/service";
import { PayrollView } from "@/features/payroll/components/payroll-view";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Payroll" };
export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const user = await requireUser();
  const periods = await payrollService.listPeriods();

  return (
    <>
      <PageHeader
        title="Payroll"
        description="Run monthly payroll, review processed periods, and manage disbursement status."
      />
      <PayrollView periods={periods} isAdmin={user.role === "ADMIN"} />
    </>
  );
}
