"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import type { DepartmentBreakdownDto } from "../service";

/** Latest-period gross payroll per department. */
export function DepartmentChart({ data }: { data: DepartmentBreakdownDto[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="code"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v)}
          width={70}
        />
        <Tooltip
          formatter={(value: number | string) => [
            formatCurrency(Number(value)),
            "Gross payroll",
          ]}
          labelFormatter={(code) => {
            const row = data.find((d) => d.code === code);
            return row ? `${row.department} (${row.employees} employees)` : code;
          }}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Bar
          dataKey="totalGross"
          fill="hsl(222 60% 24%)"
          radius={[4, 4, 0, 0]}
          maxBarSize={56}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
