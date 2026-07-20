"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DepartmentDto } from "@/features/departments";
import type { EmployeeDto, PaginatedResult } from "../dto";
import {
  deactivateEmployeeAction,
  reactivateEmployeeAction,
} from "../actions";
import { EmployeeFormDialog } from "./employee-form-dialog";

const ALL = "__all__";

interface EmployeesViewProps {
  data: PaginatedResult<EmployeeDto>;
  departments: DepartmentDto[];
  canManage: boolean;
}

/**
 * Employees list: URL-driven search/filter/pagination (server refetches via
 * searchParams), client-side dialogs for create/edit/deactivate.
 */
export function EmployeesView({
  data,
  departments,
  canManage,
}: EmployeesViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeDto | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<EmployeeDto | null>(null);

  // ── URL state helpers ────────────────────────────────────────────────────
  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams],
  );

  // Debounced search box.
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);
  function onSearchChange(value: string) {
    setSearch(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setParams({ search: value || null, page: null });
    }, 350);
  }

  async function toggleActive(employee: EmployeeDto) {
    const action =
      employee.status === "INACTIVE"
        ? reactivateEmployeeAction
        : deactivateEmployeeAction;
    const result = await action(employee.id);
    if (result.success) {
      toast.success(
        employee.status === "INACTIVE"
          ? "Employee reactivated"
          : "Employee deactivated",
        { description: employee.fullName },
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, ID, position…"
            className="pl-9"
            aria-label="Search employees"
          />
        </div>
        <Select
          value={searchParams.get("departmentId") ?? ALL}
          onValueChange={(v) =>
            setParams({ departmentId: v === ALL ? null : v, page: null })
          }
        >
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get("status") ?? ALL}
          onValueChange={(v) =>
            setParams({ status: v === ALL ? null : v, page: null })
          }
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ON_LEAVE">On leave</SelectItem>
          </SelectContent>
        </Select>
        {canManage ? (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add employee
          </Button>
        ) : null}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {data.items.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              description="Try adjusting the search or filters, or add a new employee."
              action={
                canManage ? (
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add employee
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Employment date</TableHead>
                    <TableHead className="text-right">Base salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/employees/${emp.id}`}
                          className="block hover:underline"
                        >
                          <span className="font-medium">{emp.fullName}</span>
                          <span className="block text-xs text-muted-foreground">
                            {emp.employeeNumber} · {emp.email}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>{emp.position}</TableCell>
                      <TableCell>{emp.department.name}</TableCell>
                      <TableCell>{formatDate(emp.employmentDate)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(emp.baseSalary)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={emp.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Actions for ${emp.fullName}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/employees/${emp.id}`}>
                                <Eye className="h-4 w-4" />
                                View profile
                              </Link>
                            </DropdownMenuItem>
                            {canManage ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditing(emp);
                                    setFormOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {emp.status === "INACTIVE" ? (
                                  <DropdownMenuItem
                                    onClick={() => void toggleActive(emp)}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                    Reactivate
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setConfirmTarget(emp)}
                                  >
                                    <UserX className="h-4 w-4" />
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={data.pageSize}
                onPageChange={(p) => setParams({ page: String(p) })}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        departments={departments}
        employee={editing}
        onSaved={() => router.refresh()}
      />

      {/* Deactivate confirmation */}
      <ConfirmDialog
        open={Boolean(confirmTarget)}
        onOpenChange={(v) => !v && setConfirmTarget(null)}
        title="Deactivate employee?"
        description={
          confirmTarget
            ? `${confirmTarget.fullName} will be excluded from future payroll runs. Historical records are preserved.`
            : ""
        }
        confirmLabel="Deactivate"
        destructive
        onConfirm={async () => {
          if (confirmTarget) await toggleActive(confirmTarget);
        }}
      />
    </>
  );
}
