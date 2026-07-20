"use client";

import { useCallback, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, Clock, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { MONTH_NAMES } from "@/features/payroll/dto";
import { upsertTimeEntryAction } from "../actions";
import type { TimesheetRowDto } from "../service";

interface TimesheetViewProps {
  rows: TimesheetRowDto[];
  year: number;
  month: number;
  /** True when the payroll period for this month is PROCESSED/PAID. */
  locked: boolean;
  canEdit: boolean;
}

interface Draft {
  regularHours: string;
  overtimeHours: string;
  sickLeaveDays: string;
  vacationDays: string;
}

/** Editable monthly timesheet grid with per-row save. */
export function TimesheetView({
  rows,
  year,
  month,
  locked,
  canEdit,
}: TimesheetViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const setPeriod = useCallback(
    (nextYear: number, nextMonth: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", String(nextYear));
      params.set("month", String(nextMonth));
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  const editable = canEdit && !locked;

  function draftFor(row: TimesheetRowDto): Draft {
    return (
      drafts[row.employeeId] ?? {
        regularHours: String(row.regularHours),
        overtimeHours: String(row.overtimeHours),
        sickLeaveDays: String(row.sickLeaveDays),
        vacationDays: String(row.vacationDays),
      }
    );
  }

  function updateDraft(row: TimesheetRowDto, patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [row.employeeId]: { ...draftFor(row), ...patch },
    }));
  }

  function isDirty(row: TimesheetRowDto): boolean {
    const d = drafts[row.employeeId];
    if (!d) return false;
    return (
      Number(d.regularHours) !== row.regularHours ||
      Number(d.overtimeHours) !== row.overtimeHours ||
      Number(d.sickLeaveDays) !== row.sickLeaveDays ||
      Number(d.vacationDays) !== row.vacationDays
    );
  }

  async function saveRow(row: TimesheetRowDto) {
    const d = draftFor(row);
    setSavingId(row.employeeId);
    try {
      const result = await upsertTimeEntryAction({
        employeeId: row.employeeId,
        year,
        month,
        regularHours: d.regularHours,
        overtimeHours: d.overtimeHours,
        sickLeaveDays: d.sickLeaveDays,
        vacationDays: d.vacationDays,
      });
      if (result.success) {
        toast.success("Timesheet saved", { description: row.fullName });
        setDrafts((prev) => {
          const next = { ...prev };
          delete next[row.employeeId];
          return next;
        });
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setSavingId(null);
    }
  }

  const years = Array.from({ length: 5 }, (_, i) => year - 2 + i);

  return (
    <>
      {/* Period selector + lock notice */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={String(month)}
          onValueChange={(v) => setPeriod(year, Number(v))}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={name} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(year)}
          onValueChange={(v) => setPeriod(Number(v), month)}
        >
          <SelectTrigger className="sm:w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {locked ? (
          <Badge variant="warning" className="gap-1">
            <Lock className="h-3 w-3" />
            Locked — payroll for this period is processed
          </Badge>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No active employees"
              description="Add employees before recording working hours."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="w-28 text-right">Regular (h)</TableHead>
                  <TableHead className="w-28 text-right">Overtime (h)</TableHead>
                  <TableHead className="w-24 text-right">Sick (d)</TableHead>
                  <TableHead className="w-24 text-right">Vacation (d)</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const d = draftFor(row);
                  const dirty = isDirty(row);
                  const saving = savingId === row.employeeId;
                  return (
                    <TableRow key={row.employeeId}>
                      <TableCell>
                        <span className="font-medium">{row.fullName}</span>
                        <span className="block text-xs text-muted-foreground">
                          {row.employeeNumber}
                        </span>
                      </TableCell>
                      <TableCell>{row.department}</TableCell>
                      {(
                        [
                          ["regularHours", 0.5],
                          ["overtimeHours", 0.5],
                          ["sickLeaveDays", 1],
                          ["vacationDays", 1],
                        ] as const
                      ).map(([field, step]) => (
                        <TableCell key={field} className="text-right">
                          {editable ? (
                            <Input
                              type="number"
                              min={0}
                              step={step}
                              value={d[field]}
                              onChange={(e) =>
                                updateDraft(row, { [field]: e.target.value })
                              }
                              className="ml-auto h-8 w-24 text-right"
                              aria-label={`${field} for ${row.fullName}`}
                            />
                          ) : (
                            <span>{d[field]}</span>
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        {editable ? (
                          <Button
                            size="sm"
                            variant={dirty ? "default" : "outline"}
                            disabled={!dirty || saving}
                            onClick={() => void saveRow(row)}
                          >
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Save
                          </Button>
                        ) : row.hasEntry ? (
                          <Badge variant="secondary">Recorded</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No entry
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
