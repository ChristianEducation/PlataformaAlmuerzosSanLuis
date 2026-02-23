"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AdminMetricasExportButton } from "./export-button";

type MonthOption = { value: string; label: string };

type Props = {
  monthParam: string;
  monthOptions: MonthOption[];
  monthTotal: number;
  dailyData: { date: string; entregas: number }[];
};

export function AdminMetricasFilterBar({
  monthParam,
  monthOptions,
  monthTotal,
  dailyData,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("month", value);
    router.push(`/admin-metricas?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full space-y-1 sm:w-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Mes</p>
          <select
            name="month"
            value={monthParam}
            onChange={(e) => handleChange(e.target.value)}
            className="h-9 w-full rounded-lg border border-[#eeeff2] bg-white px-3 text-sm text-slate-900 shadow-[var(--shadow-xs)] sm:w-[220px] md:w-[240px]"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full items-end sm:w-auto">
          <AdminMetricasExportButton
            monthParam={monthParam}
            monthTotal={monthTotal}
            dailyData={dailyData}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500 sm:whitespace-nowrap sm:text-right">
        El filtro aplica al calendario y a la exportación.
      </p>
    </div>
  );
}
