import { Badge } from "@/components/ui/badge";

/**
 * Maps domain statuses to consistent badge variants across the app,
 * so "PROCESSED is blue, PAID is green" is decided in exactly one place.
 */
const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
> = {
  // Employee
  ACTIVE: "success",
  INACTIVE: "secondary",
  ON_LEAVE: "warning",
  // Payroll
  DRAFT: "outline",
  PROCESSED: "info",
  PAID: "success",
  CANCELLED: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ON_LEAVE: "On leave",
  DRAFT: "Draft",
  PROCESSED: "Processed",
  PAID: "Paid",
  CANCELLED: "Cancelled",
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  STANDARD: "Standard",
  REDUCED: "Reduced",
  EXEMPT: "Exempt",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
