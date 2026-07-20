import { excelReportService } from "@/features/reports/excel.service";
import { excelResponse } from "@/features/reports/excel-route-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/reports/department-summary — department payroll summary (.xlsx). */
export async function GET() {
  return excelResponse("department-summary", (userId) =>
    excelReportService.buildDepartmentSummaryReport(userId),
  );
}
