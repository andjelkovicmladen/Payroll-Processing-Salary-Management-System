import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Building2,
  TrendingUp,
  Users,
} from "lucide-react";
import { reportService } from "@/features/reports/service";
import { PayrollTrendChart } from "@/features/reports/components/payroll-trend-chart";
import { DepartmentChart } from "@/features/reports/components/department-chart";
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
import { formatCurrency, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, trend, departments, recentRuns] = await Promise.all([
    reportService.getDashboardStats(),
    reportService.getPayrollTrend(),
    reportService.getDepartmentBreakdown(),
    reportService.getRecentRuns(),
  ]);

  const kpis = [
    {
      label: "Total Employees",
      value: String(stats.totalEmployees),
      hint: `${stats.activeEmployees} active`,
      icon: Users,
    },
    {
      label: "Monthly Payroll Cost",
      value: formatCurrency(stats.monthlyPayrollCost),
      hint: stats.latestPeriodLabel
        ? `incl. employer contributions · ${stats.latestPeriodLabel}`
        : "no processed payroll yet",
      icon: Banknote,
    },
    {
      label: "Average Gross Salary",
      value: formatCurrency(stats.averageGrossSalary),
      hint: stats.latestPeriodLabel ?? "—",
      icon: TrendingUp,
    },
    {
      label: "Departments",
      value: String(stats.departmentCount),
      hint: "across the organization",
      icon: Building2,
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Company-wide payroll overview and key metrics."
      />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payroll Trend</CardTitle>
            <CardDescription>
              Gross vs. net payroll and total employer cost by month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trend.length > 0 ? (
              <PayrollTrendChart data={trend} />
            ) : (
              <EmptyState
                title="No payroll data yet"
                description="Run your first payroll to see trends here."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Department Breakdown</CardTitle>
            <CardDescription>
              Gross payroll by department for the latest period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {departments.length > 0 ? (
              <DepartmentChart data={departments} />
            ) : (
              <EmptyState
                title="No department data"
                description="Department totals appear after the first payroll run."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent runs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Payroll Runs</CardTitle>
            <CardDescription>The last five payroll periods.</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/payroll">
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentRuns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Total Net</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/payroll/${run.id}`}
                        className="hover:underline"
                      >
                        {run.label}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-right">{run.employees}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(run.totalNet)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {run.processedAt ? formatDateTime(run.processedAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No payroll runs yet"
              description="Process your first payroll from the Payroll page."
              action={
                <Button asChild>
                  <Link href="/dashboard/payroll">Go to Payroll</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
