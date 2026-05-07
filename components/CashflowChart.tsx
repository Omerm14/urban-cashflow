"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ChartDatum {
  month: string;
  total: number;
}

export default function CashflowChart({ data }: { data: ChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value) =>
            new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS" }).format(Number(value))
          }
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? "#2563eb" : "#93c5fd"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
