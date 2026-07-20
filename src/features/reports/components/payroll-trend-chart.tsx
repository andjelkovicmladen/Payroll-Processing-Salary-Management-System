"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import type { PayrollTrendPointDto } from "../service";

/** 12-month payroll trend: gross vs. net vs. total employer cost. */
export function PayrollTrendChart({ data }: { data: PayrollTrendPointDto[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="gross" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(222 60% 24%)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(222 60% 24%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="net" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatCompactCurrency(v)}
          width={70}
        />
        <Tooltip
          formatter={(value: number | string, name: string) => [
            formatCurrency(Number(value)),
            name === "gross" ? "Gross" : name === "net" ? "Net" : "Employer cost",
          ]}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="employerCost"
          stroke="hsl(215 16% 47%)"
          strokeDasharray="4 4"
          fill="transparent"
          strokeWidth={1.5}
        />
        <Area
          type="monotone"
          dataKey="gross"
          stroke="hsl(222 60% 24%)"
          fill="url(#gross)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="net"
          stroke="hsl(160 84% 39%)"
          fill="url(#net)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
