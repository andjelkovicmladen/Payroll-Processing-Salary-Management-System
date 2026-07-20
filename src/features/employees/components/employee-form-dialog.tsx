"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  createEmployeeAction,
  suggestEmployeeNumberAction,
  updateEmployeeAction,
} from "../actions";
import type { EmployeeDto } from "../dto";
import type { DepartmentDto } from "@/features/departments";

/**
 * Client-side form schema: keeps date & salary as strings for input ergonomics;
 * the server action re-validates authoritatively with the canonical schema.
 */
const formSchema = z.object({
  employeeNumber: z.string().trim().min(1, "Required"),
  firstName: z.string().trim().min(1, "Required"),
  lastName: z.string().trim().min(1, "Required"),
  email: z.string().trim().email("Invalid email"),
  position: z.string().trim().min(1, "Required"),
  departmentId: z.string().min(1, "Select a department"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT"]),
  employmentDate: z.string().min(1, "Required"),
  baseSalary: z
    .string()
    .min(1, "Required")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, {
      message: "Must be a positive number",
    }),
  taxCategory: z.enum(["STANDARD", "REDUCED", "EXEMPT"]),
});

type FormValues = z.infer<typeof formSchema>;

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: DepartmentDto[];
  /** When set, the dialog edits this employee; otherwise it creates. */
  employee?: EmployeeDto | null;
  onSaved: () => void;
}

const EMPTY: FormValues = {
  employeeNumber: "",
  firstName: "",
  lastName: "",
  email: "",
  position: "",
  departmentId: "",
  employmentType: "FULL_TIME",
  employmentDate: "",
  baseSalary: "",
  taxCategory: "STANDARD",
};

export function EmployeeFormDialog({
  open,
  onOpenChange,
  departments,
  employee,
  onSaved,
}: EmployeeFormDialogProps) {
  const isEdit = Boolean(employee);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY,
  });

  // Populate on open: edit → employee values; create → suggested number.
  useEffect(() => {
    if (!open) return;
    if (employee) {
      reset({
        employeeNumber: employee.employeeNumber,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        position: employee.position,
        departmentId: employee.department.id,
        employmentType: employee.employmentType as FormValues["employmentType"],
        employmentDate: employee.employmentDate.slice(0, 10),
        baseSalary: String(employee.baseSalary),
        taxCategory: employee.taxCategory as FormValues["taxCategory"],
      });
    } else {
      reset(EMPTY);
      void suggestEmployeeNumberAction().then((res) => {
        if (res.success) setValue("employeeNumber", res.data);
      });
    }
  }, [open, employee, reset, setValue]);

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        baseSalary: Number(values.baseSalary),
      };
      const result = isEdit
        ? await updateEmployeeAction({ ...payload, id: employee!.id })
        : await createEmployeeAction(payload);

      if (result.success) {
        toast.success(
          isEdit ? "Employee updated" : "Employee created",
          { description: `${values.firstName} ${values.lastName}` },
        );
        onOpenChange(false);
        onSaved();
        return;
      }

      // Surface field-level errors from the server, if any.
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (field in EMPTY && messages[0]) {
            setError(field as keyof FormValues, { message: messages[0] });
          }
        }
      }
      toast.error(result.error);
    } finally {
      setSubmitting(false);
    }
  }

  const departmentId = watch("departmentId");
  const employmentType = watch("employmentType");
  const taxCategory = watch("taxCategory");

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "New employee"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the employee's master data."
              : "Add a new employee to the payroll register."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Employee ID" error={errors.employeeNumber?.message}>
            <Input {...register("employeeNumber")} placeholder="EMP-0001" />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input
              {...register("email")}
              type="email"
              placeholder="name@company.com"
            />
          </Field>
          <Field label="First name" error={errors.firstName?.message}>
            <Input {...register("firstName")} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <Input {...register("lastName")} />
          </Field>
          <Field label="Position" error={errors.position?.message}>
            <Input {...register("position")} placeholder="e.g. Accountant" />
          </Field>
          <Field label="Department" error={errors.departmentId?.message}>
            <Select
              value={departmentId}
              onValueChange={(v) =>
                setValue("departmentId", v, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Employment type" error={errors.employmentType?.message}>
            <Select
              value={employmentType}
              onValueChange={(v) =>
                setValue("employmentType", v as FormValues["employmentType"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL_TIME">Full-time</SelectItem>
                <SelectItem value="PART_TIME">Part-time</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Employment date" error={errors.employmentDate?.message}>
            <Input {...register("employmentDate")} type="date" />
          </Field>
          <Field label="Base salary (monthly, €)" error={errors.baseSalary?.message}>
            <Input
              {...register("baseSalary")}
              type="number"
              step="0.01"
              min="0"
              placeholder="3000.00"
            />
          </Field>
          <Field label="Tax category" error={errors.taxCategory?.message}>
            <Select
              value={taxCategory}
              onValueChange={(v) =>
                setValue("taxCategory", v as FormValues["taxCategory"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STANDARD">Standard</SelectItem>
                <SelectItem value="REDUCED">Reduced (relief)</SelectItem>
                <SelectItem value="EXEMPT">Exempt</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
