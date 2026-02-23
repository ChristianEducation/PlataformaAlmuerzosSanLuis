"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx-js-style";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EntregaRow = {
  id: number;
  fecha: string;
  horaLabel: string;
  personaNombre: string;
  personaEmail: string | null;
  usuario: string;
};

type Filters = {
  dateFrom: string;
  dateTo: string;
  q?: string;
};

type Props = {
  rows: EntregaRow[];
  initialFilters: Filters;
  errorMessage?: string | null;
};

export function EntregasClient({ rows, initialFilters, errorMessage }: Props) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const todayChileISO = () => {
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
  };


  const hasData = rows.length > 0;

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set("desde", filters.dateFrom);
    if (filters.dateTo) params.set("hasta", filters.dateTo);
    if (filters.q) params.set("q", filters.q);
    router.push(`/admin/entregas?${params.toString()}`);
  };

  const handleReset = () => {
    const today = todayChileISO();
    setFilters({ dateFrom: today, dateTo: today, q: "" });
    const params = new URLSearchParams();
    params.set("desde", today);
    params.set("hasta", today);
    router.push(`/admin/entregas?${params.toString()}`);
  };

  const handleExportExcel = () => {
    if (!hasData) return;
    const monthLabel = new Intl.DateTimeFormat("es-CL", {
      month: "long",
      year: "numeric",
      timeZone: "America/Santiago",
    }).format(new Date(`${dateFromValue || dateToValue}-01T12:00:00Z`));
    const monthParts = monthLabel.split(" ");
    const monthName = monthParts[0]
      ? monthParts[0].charAt(0).toUpperCase() + monthParts[0].slice(1)
      : "Mes";
    const monthYear = monthParts[2] || monthParts[1] || "";
    const monthTitle = `${monthName} ${monthYear}`.trim();
    const monthFileLabel = `${monthName}-${monthYear}`.trim();
    const rangeLabel = dateFromValue && dateToValue
      ? `${dateFromValue}_a_${dateToValue}`
      : dateFromValue || dateToValue || monthFileLabel;

    const wb = XLSX.utils.book_new();

    const detailRows = rows.map((r) => ({
      Fecha: r.fecha,
      Hora: r.horaLabel,
      Persona: r.personaNombre,
      Email: r.personaEmail || "",
      Usuario: r.usuario,
    }));
    const detailSheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(detailSheet, [[`Historial de Entregas - ${monthTitle}`]], {
      origin: "A1",
    });
    XLSX.utils.sheet_add_aoa(detailSheet, [["Fecha", "Hora", "Persona", "Email", "Usuario"]], {
      origin: "A2",
    });
    XLSX.utils.sheet_add_json(detailSheet, detailRows, { origin: "A3", skipHeader: true });

    const dailyTotals = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.fecha] = (acc[row.fecha] || 0) + 1;
      return acc;
    }, {});
    const summaryRows = Object.entries(dailyTotals).map(([fecha, total]) => ({
      Fecha: fecha,
      "Total entregas": total,
    }));
    const summarySheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(summarySheet, [[`Resumen diario - ${monthTitle}`]], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(summarySheet, [["Fecha", "Total entregas"]], { origin: "A2" });
    XLSX.utils.sheet_add_json(summarySheet, summaryRows, { origin: "A3", skipHeader: true });

    const headerStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "FFD85F" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
        left: { style: "thin", color: { rgb: "D1D5DB" } },
        right: { style: "thin", color: { rgb: "D1D5DB" } },
      },
    };

    const applyBorders = (sheet: XLSX.WorkSheet) => {
      const range = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : null;
      if (!range) return;
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = XLSX.utils.encode_cell({ r, c });
          if (!sheet[cell]) continue;
          sheet[cell].s = {
            ...(sheet[cell].s || {}),
            border: {
              top: { style: "thin", color: { rgb: "D1D5DB" } },
              bottom: { style: "thin", color: { rgb: "D1D5DB" } },
              left: { style: "thin", color: { rgb: "D1D5DB" } },
              right: { style: "thin", color: { rgb: "D1D5DB" } },
            },
          };
        }
      }
    };

    detailSheet["A1"].s = { font: { bold: true }, alignment: { horizontal: "left" } };
    summarySheet["A1"].s = { font: { bold: true }, alignment: { horizontal: "left" } };
    ["A2", "B2", "C2", "D2", "E2"].forEach((cell) => {
      if (detailSheet[cell]) detailSheet[cell].s = headerStyle;
    });
    ["A2", "B2"].forEach((cell) => {
      if (summarySheet[cell]) summarySheet[cell].s = headerStyle;
    });

    detailSheet["!cols"] = [
      { wch: 12 },
      { wch: 8 },
      { wch: 24 },
      { wch: 26 },
      { wch: 16 },
    ];
    summarySheet["!cols"] = [{ wch: 12 }, { wch: 16 }];

    applyBorders(detailSheet);
    applyBorders(summarySheet);

    XLSX.utils.book_append_sheet(wb, detailSheet, `Detalle ${monthFileLabel}`);
    XLSX.utils.book_append_sheet(wb, summarySheet, `Resumen ${monthFileLabel}`);
    XLSX.writeFile(wb, `historial_entregas_${rangeLabel}.xlsx`);
  };

  const dateFromValue = filters.dateFrom;
  const dateToValue = filters.dateTo;
  const qValue = filters.q || "";

  const subtitle = useMemo(() => {
    if (qValue && !dateFromValue && !dateToValue) return `Búsqueda: ${qValue}`;
    if (dateFromValue && dateFromValue === dateToValue) return `Fecha: ${dateFromValue}`;
    if (dateFromValue || dateToValue) {
      return `Rango: ${dateFromValue || "—"} a ${dateToValue || "—"}`;
    }
    return "Sin rango de fechas aplicado";
  }, [dateFromValue, dateToValue, qValue]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          Historial de Entregas
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Historial de Entregas</h1>
            <p className="text-sm text-slate-600">
              Revisa entregas registradas por rango y búsqueda. {subtitle}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              onClick={handleExportExcel}
              className="h-10 w-full rounded-lg bg-[#ffd85f] text-black shadow-[var(--shadow-xs)] hover:bg-[#f2c94c] sm:w-auto"
              disabled={!hasData}
            >
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="h-10 w-full border-[#eeeff2] sm:w-auto"
            >
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
          {errorMessage}
        </div>
      ) : null}

      <Card className="border-[#eeeff2] shadow-[var(--shadow-card)]">
        <CardHeader className="space-y-4">
          <CardTitle className="text-base font-semibold text-slate-900">
            Filtros
          </CardTitle>
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Búsqueda
              </p>
              <Input
                placeholder="Nombre o correo"
                value={qValue}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 placeholder:text-[#a4abb8] shadow-[var(--shadow-xs)]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Desde
              </p>
              <Input
                type="date"
                value={dateFromValue}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Hasta
              </p>
              <Input
                type="date"
                value={dateToValue}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
              />
            </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleApplyFilters}
              className="h-10 w-full bg-[#ffd85f] text-black shadow-[var(--shadow-xs)] hover:bg-[#f2c94c] sm:w-auto"
            >
              Aplicar filtros
            </Button>
            <span className="rounded-full border border-[#eeeff2] bg-[#f8f9fb] px-3 py-1 text-xs font-semibold text-slate-600">
              Total: {rows.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-[#f1f2f5] text-sm">
              <thead className="bg-[#f8f9fb] text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Hora</th>
                  <th className="px-4 py-3 text-left font-semibold">Persona</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f2f5] bg-white text-slate-900">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No hay entregas para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#f8f9fb]">
                      <td className="px-4 py-3 whitespace-nowrap">{row.horaLabel}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.personaNombre}</div>
                        <div className="text-xs text-slate-500">{row.fecha}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.personaEmail || "Sin correo"}</td>
                      <td className="px-4 py-3 text-slate-700">{row.usuario}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[#f1f2f5] md:hidden">
            {rows.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No hay entregas para los filtros seleccionados.
              </div>
            ) : (
              rows.map((row) => (
                <div key={row.id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold text-slate-900">{row.personaNombre}</div>
                    <div className="text-sm text-slate-600">{row.horaLabel}</div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{row.fecha}</div>
                  <div className="mt-2 space-y-1 text-sm text-slate-700">
                    <div>Email: {row.personaEmail || "Sin correo"}</div>
                    <div>Usuario: {row.usuario}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
