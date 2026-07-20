import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { employeeService } from "@/features/employees/service";
import { payrollService } from "@/features/payroll/service";
import { NotFoundError } from "@/lib/errors";
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
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate, formatHours } from "@/lib/format";

export const metadata: Metadata = { title: "Employee profile" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { id } = await params;

  let employee;
  try {
    employee = await employeeService.getById(id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  const history = await payrollService.getEmployeeSalaryHistory(id);

  const profileRows: Array<[string, React.ReactNode]> = [
    ["Employee ID", employee.employeeNumber],
    ["Email", employee.email],
    ["Position", employee.position],
    [
      "Department",
      `${employee.department.name} (${employee.department.code})`,
    ],
    ["Employment type", <StatusBadge key="et" status={employee.employmentType} />],
    ["Employment date", formatDate(employee.employmentDate)],
    ["Base salary", formatCurrency(employee.baseSalary)],
    ["Tax category", <StatusBadge key="tc" status={employee.taxCategory} />],
    ["Status", <StatusBadge key="st" status={employee.status} />],
  ];

  return (
    <>
      <PageHeader
        title={employee.fullName}
        description={`${employee.position} · ${employee.department.name}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/employees">
              <ArrowLeft className="h-4 w-4" />
              Back to employees
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Profile card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Employee master data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {profileRows.map(([label, value], i) => (
              <div key={label}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
                {i < profileRows.length - 1 ? (
                  <Separator className="mt-3" />
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Salary history */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Salary history</CardTitle>
              <CardDescription>
                Net and gross pay across processed payroll periods.
              </CardDescription>
            </div>
            {history.length > 0 ? (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/api/reports/employee-history/${employee.id}`}
                  download
                >
                  <Download className="h-4 w-4" />
                  Export Excel
                </a>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No payroll history"
                description="This employee has not been included in any processed payroll run yet."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Overtime</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Tax</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                    <TableHead className="text-right">Payslip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.recordId}>
                      <TableCell className="font-medium">{h.label}</TableCell>
                      <TableCell>
                        <StatusBadge status={h.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatHours(h.overtimeHours)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(h.grossSalary)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(h.incomeTax)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(h.netSalary)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`/api/payslips/${h.recordId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="h-4 w-4" />
                            PDF
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
      </div>
    </>
  );
}
