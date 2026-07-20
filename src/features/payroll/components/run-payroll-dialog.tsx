"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_NAMES } from "../dto";
import { processPayrollAction } from "../actions";

interface RunPayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Payroll run dialog: pick a period, confirm, process.
 * The server enforces all invariants; this UI simply reports the outcome.
 */
export function RunPayrollDialog({ open, onOpenChange }: RunPayrollDialogProps) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [notes, setNotes] = useState("");
  const [running, setRunning] = useState(false);

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 2 + i);

  async function run() {
    setRunning(true);
    try {
      const result = await processPayrollAction({ year, month, notes });
      if (result.success) {
        toast.success(`Payroll processed for ${result.data.label}`, {
          description: `${result.data.recordCount} employees · net total ${result.data.totalNet.toLocaleString("en-US", { style: "currency", currency: "EUR" })}`,
        });
        onOpenChange(false);
        setNotes("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !running && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run payroll</DialogTitle>
          <DialogDescription>
            Calculates gross, tax, contributions, and net pay for every active
            employee using their recorded hours. The run is frozen once
            processed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(Number(v))}
              >
                <SelectTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger>
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
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Includes annual bonus adjustments"
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={running}
          >
            Cancel
          </Button>
          <Button onClick={() => void run()} disabled={running}>
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Process {MONTH_NAMES[month - 1]} {year}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
