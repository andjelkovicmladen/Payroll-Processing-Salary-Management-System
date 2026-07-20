import { excelReportService } from "@/features/reports/excel.service";
import { excelResponse } from "@/features/reports/excel-route-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/reports/employee-history/:employeeId — salary history (.xlsx). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const { employeeId } = await params;
  return excelResponse("employee-history", (userId) =>
    excelReportService.buildEmployeeHistoryReport(employeeId, userId),
  );
}
