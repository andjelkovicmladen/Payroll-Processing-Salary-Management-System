import type { Metadata } from "next";
import { timeEntryService } from "@/features/time-entries/service";
import { timeEntryFilterSchema } from "@/features/time-entries/validation";
import { TimesheetView } from "@/features/time-entries/components/timesheet-view";
import { payrollRepository } from "@/features/payroll/repository";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Time Tracking" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TimeTrackingPage({ searchParams }: PageProps) {
  const user = await requireUser();
  const raw = await searchParams;

  const now = new Date();
  const parsed = timeEntryFilterSchema.safeParse(raw);
  const filter = parsed.success
    ? parsed.data
    : { year: now.getFullYear(), month: now.getMonth() + 1 };

  const [rows, period] = await Promise.all([
    timeEntryService.getMonthlyTimesheet(filter),
    payrollRepository.findPeriodByYearMonth(filter.year, filter.month),
  ]);

  const locked =
    Boolean(period) &&
    period!.status !== "DRAFT" &&
    period!.status !== "CANCELLED";
  const canEdit = user.role === "ADMIN" || user.role === "HR";

  return (
    <>
      <PageHeader
        title="Time Tracking"
        description="Record monthly working hours, overtime, sick leave, and vacation days."
      />
      <TimesheetView
        rows={rows}
        year={filter.year}
        month={filter.month}
        locked={locked}
        canEdit={canEdit}
      />
    </>
  );
}
