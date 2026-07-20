import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Building2, Download, FileSpreadsheet, Users } from "lucide-react";
import { payrollService } from "@/features/payroll/service";
import { reportService } from "@/features/reports/service";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [periods, breakdown] = await Promise.all([
    payrollService.listPeriods(),
    reportService.getDepartmentBreakdown(),
  ]);

  const reportable = periods.filter(
    (p) => p.status === "PROCESSED" || p.status === "PAID",
  );

  return (
    <>
      <PageHeader
        title="Reports"
        description="Export payroll registers, department summaries, and salary histories to Excel."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Monthly payroll reports */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Monthly payroll reports</CardTitle>
            </div>
            <CardDescription>
              Full itemized payroll register per period — gross, tax,
              contributions, and net for every employee.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {reportable.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No processed payroll"
                description="Reports become available after the first payroll run."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Employees</TableHead>
                    <TableHead className="text-right">Net total</TableHead>
                    <TableHead className="text-right">Export</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportable.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.label}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {p.recordCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(p.totalNet)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`/api/reports/payroll-period/${p.id}`}
                            download
                          >
                            <Download className="h-4 w-4" />
                            Excel
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Other exports */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Department summary</CardTitle>
              </div>
              <CardDescription>
                Payroll totals per department for the latest processed period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                asChild
                aria-disabled={breakdown.length === 0}
              >
                <a href="/api/reports/department-summary" download>
                  <Download className="h-4 w-4" />
                  Download Excel
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Employee salary history</CardTitle>
              </div>
              <CardDescription>
                Per-employee history exports are available from each employee
                profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/employees">
                  <Users className="h-4 w-4" />
                  Browse employees
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inline department summary */}
      {breakdown.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Department breakdown — latest period</CardTitle>
            <CardDescription>
              The same dataset as the Excel export, for quick reference.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Total gross</TableHead>
                  <TableHead className="text-right">Total net</TableHead>
                  <TableHead className="text-right">Average gross</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {breakdown.map((d) => (
                  <TableRow key={d.code}>
                    <TableCell className="font-medium">{d.department}</TableCell>
                    <TableCell>{d.code}</TableCell>
                    <TableCell className="text-right">{d.employees}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(d.totalGross)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(d.totalNet)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(d.averageGross)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
