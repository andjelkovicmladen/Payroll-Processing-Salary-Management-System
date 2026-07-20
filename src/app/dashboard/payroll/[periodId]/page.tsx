import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { payrollService } from "@/features/payroll/service";
import { NotFoundError } from "@/lib/errors";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatHours } from "@/lib/format";

export const metadata: Metadata = { title: "Payroll period" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ periodId: string }>;
}

export default async function PayrollPeriodPage({ params }: PageProps) {
  const { periodId } = await params;

  let detail;
  try {
    detail = await payrollService.getPeriodDetail(periodId);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  const { period, records } = detail;

  const summary = [
    { label: "Gross total", value: formatCurrency(period.totalGross) },
    { label: "Income tax", value: formatCurrency(period.totalTax) },
    { label: "Net total", value: formatCurrency(period.totalNet) },
    {
      label: "Total employer cost",
      value: formatCurrency(period.totalEmployerCost),
    },
  ];

  return (
    <>
      <PageHeader
        title={`Payroll — ${period.label}`}
        description={
          period.notes ? `Notes: ${period.notes}` : "Itemized payroll register."
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/dashboard/payroll">
                <ArrowLeft className="h-4 w-4" />
                All periods
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={`/api/reports/payroll-period/${period.id}`} download>
                <Download className="h-4 w-4" />
                Export Excel
              </a>
            </Button>
          </>
        }
      />

      <div className="flex items-center gap-3">
        <StatusBadge status={period.status} />
        <span className="text-sm text-muted-foreground">
          {period.recordCount} employees in this run
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Hours (OT)</TableHead>
                <TableHead className="text-right">Base</TableHead>
                <TableHead className="text-right">Overtime pay</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Contributions</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead className="text-right">Payslip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/employees/${r.employeeId}`}
                      className="hover:underline"
                    >
                      <span className="font-medium">{r.employeeName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {r.employeeNumber} · {r.position}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>{r.department}</TableCell>
                  <TableCell className="text-right">
                    {formatHours(r.regularHours)}
                    {r.overtimeHours > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        (+{formatHours(r.overtimeHours)})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(r.baseSalary)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(r.overtimePay)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(r.grossSalary)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(r.incomeTax)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(r.employeeContrib)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(r.netSalary)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={`/api/payslips/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Payslip for ${r.employeeName}`}
                      >
                        <FileText className="h-4 w-4" />
                        PDF
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="font-semibold">
                  Totals
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(period.totalGross)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(period.totalTax)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold">
                  {formatCurrency(period.totalNet)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
