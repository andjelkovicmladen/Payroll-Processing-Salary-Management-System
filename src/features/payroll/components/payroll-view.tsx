"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  Ban,
  Eye,
  MoreHorizontal,
  PlayCircle,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { PayrollPeriodDto } from "../dto";
import { cancelPayrollAction, markPayrollPaidAction } from "../actions";
import { RunPayrollDialog } from "./run-payroll-dialog";

interface PayrollViewProps {
  periods: PayrollPeriodDto[];
  isAdmin: boolean;
}

type PendingAction =
  | { kind: "cancel"; period: PayrollPeriodDto }
  | { kind: "pay"; period: PayrollPeriodDto }
  | null;

export function PayrollView({ periods, isAdmin }: PayrollViewProps) {
  const router = useRouter();
  const [runOpen, setRunOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);

  async function executePending() {
    if (!pending) return;
    const action =
      pending.kind === "cancel" ? cancelPayrollAction : markPayrollPaidAction;
    const result = await action(pending.period.id);
    if (result.success) {
      toast.success(
        pending.kind === "cancel"
          ? `Payroll for ${pending.period.label} cancelled`
          : `Payroll for ${pending.period.label} marked as paid`,
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      {isAdmin ? (
        <div className="flex justify-end">
          <Button onClick={() => setRunOpen(true)}>
            <PlayCircle className="h-4 w-4" />
            Run payroll
          </Button>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {periods.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payroll runs yet"
              description="Process your first payroll to see periods here."
              action={
                isAdmin ? (
                  <Button onClick={() => setRunOpen(true)}>
                    <PlayCircle className="h-4 w-4" />
                    Run payroll
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Employees</TableHead>
                  <TableHead className="text-right">Gross total</TableHead>
                  <TableHead className="text-right">Net total</TableHead>
                  <TableHead className="text-right">Employer cost</TableHead>
                  <TableHead className="text-right">Processed</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {periods.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/payroll/${p.id}`}
                        className="hover:underline"
                      >
                        {p.label}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">{p.recordCount}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(p.totalGross)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.totalNet)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(p.totalEmployerCost)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.processedAt ? formatDateTime(p.processedAt) : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${p.label}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/payroll/${p.id}`}>
                              <Eye className="h-4 w-4" />
                              View details
                            </Link>
                          </DropdownMenuItem>
                          {isAdmin && p.status === "PROCESSED" ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => setPending({ kind: "pay", period: p })}
                              >
                                <BadgeCheck className="h-4 w-4" />
                                Mark as paid
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() =>
                                  setPending({ kind: "cancel", period: p })
                                }
                              >
                                <Ban className="h-4 w-4" />
                                Cancel run
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RunPayrollDialog open={runOpen} onOpenChange={setRunOpen} />

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(v) => !v && setPending(null)}
        title={
          pending?.kind === "cancel"
            ? "Cancel this payroll run?"
            : "Mark payroll as paid?"
        }
        description={
          pending?.kind === "cancel"
            ? `The ${pending.period.label} run will be voided. Time entries unlock and the period can be re-processed.`
            : pending
              ? `Confirm that salaries for ${pending.period.label} have been disbursed. Paid runs become immutable.`
              : ""
        }
        confirmLabel={pending?.kind === "cancel" ? "Cancel run" : "Mark paid"}
        destructive={pending?.kind === "cancel"}
        onConfirm={executePending}
      />
    </>
  );
}
