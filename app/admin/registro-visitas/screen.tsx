"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RegistroVisitaFilters, RegistroVisitaRow } from "./types";
import { RegistroVisitasFilters } from "./components/registro-visitas-filters";
import { RegistroVisitasTable } from "./components/registro-visitas-table";
import { updateNombreOficial } from "./services/registro-visitas.client";

type Props = {
  initialRows: RegistroVisitaRow[];
  initialFilters: RegistroVisitaFilters;
  errorMessage?: string | null;
};

function todayInChileISO() {
  const fmt = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) return new Date().toISOString().slice(0, 10);
  return `${y}-${m}-${d}`;
}

export function RegistroVisitasScreen({ initialRows, initialFilters, errorMessage }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<RegistroVisitaFilters>(initialFilters);
  const [rows, setRows] = useState<RegistroVisitaRow[]>(initialRows);

  useEffect(() => {
    setFilters(initialFilters);
    setRows(initialRows);
  }, [initialFilters, initialRows]);

  const filteredRows = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const nombre = r.personaNombre.toLowerCase();
      const oficial = r.nombreOficial ? r.nombreOficial.toLowerCase() : "";
      return nombre.includes(term) || oficial.includes(term);
    });
  }, [rows, filters.q]);

  const handleApply = () => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set("desde", filters.dateFrom);
    if (filters.dateTo) params.set("hasta", filters.dateTo);
    if (filters.tipo && filters.tipo !== "all") params.set("tipo", filters.tipo);
    if (filters.q) params.set("q", filters.q);
    router.push(`/admin/registro-visitas?${params.toString()}`);
  };

  const handleReset = () => {
    const today = todayInChileISO();
    const next = { dateFrom: today, dateTo: today, tipo: "all", q: "" };
    setFilters(next);
    const params = new URLSearchParams();
    params.set("desde", today);
    params.set("hasta", today);
    router.push(`/admin/registro-visitas?${params.toString()}`);
  };

  const handleSaveNombre = async (entregaId: number, nombreOficial: string | null) => {
    const result = await updateNombreOficial(entregaId, nombreOficial);
    if (!result.ok) return result;

    setRows((prev) =>
      prev.map((r) =>
        r.entregaId === entregaId ? { ...r, nombreOficial: result.value ?? null } : r,
      ),
    );
    return result;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl cs-card px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Gestión de fila
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Registro de Visitas</h1>
            <p className="text-sm text-slate-600">
              Controla visitas reales y visitas de emergencia con nombre oficial.
            </p>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
          {errorMessage}
        </div>
      ) : null}

      <Card className="cs-card">
        <CardHeader className="space-y-3">
          <CardTitle className="text-base font-semibold text-slate-900">Filtros</CardTitle>
          <RegistroVisitasFilters
            filters={filters}
            onChange={setFilters}
            onApply={handleApply}
            onReset={handleReset}
            totalCount={filteredRows.length}
          />
        </CardHeader>
        <CardContent className="p-0">
          <RegistroVisitasTable rows={filteredRows} onSaveNombre={handleSaveNombre} />
        </CardContent>
      </Card>
    </div>
  );
}
