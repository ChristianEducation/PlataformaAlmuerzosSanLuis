"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { MetricasExportButton } from "./export-button";

type MonthOption = { value: string; label: string };

type Props = {
  monthParam: string;
  monthOptions: MonthOption[];
  monthlyData: { month: string; label: string; entregas: number; monto: number }[];
  dailyData: { date: string; label: string; entregas: number; monto: number }[];
};

export function MetricasFilterBar({
  monthParam,
  monthOptions,
  monthlyData,
  dailyData,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("month", value);
    router.push(`/admin/metricas?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
          Mes
        </p>
        <select
          name="month"
          value={monthParam}
          onChange={(e) => handleChange(e.target.value)}
          className="h-9 w-[220px] rounded-lg border border-[#eeeff2] bg-white px-3 text-sm text-slate-900 shadow-[var(--shadow-xs)]"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <MetricasExportButton
        monthParam={monthParam}
        monthlyData={monthlyData}
        dailyData={dailyData}
      />
    </div>
  );
}
