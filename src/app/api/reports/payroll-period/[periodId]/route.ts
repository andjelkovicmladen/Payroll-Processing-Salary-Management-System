import { excelReportService } from "@/features/reports/excel.service";
import { excelResponse } from "@/features/reports/excel-route-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/reports/payroll-period/:periodId — itemized payroll register (.xlsx). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ periodId: string }> },
) {
  const { periodId } = await params;
  return excelResponse("payroll-period", (userId) =>
    excelReportService.buildPayrollPeriodReport(periodId, userId),
  );
}
