"use client";

import * as XLSX from "xlsx-js-style";
import { Button } from "@/components/ui/button";

type MonthlyRow = {
  month: string;
  label: string;
  entregas: number;
  monto: number;
};

type DailyRow = {
  date: string;
  label: string;
  entregas: number;
  monto: number;
};

type Props = {
  monthParam: string;
  monthlyData: MonthlyRow[];
  dailyData: DailyRow[];
};

export function MetricasExportButton({ monthParam, monthlyData, dailyData }: Props) {
  const handleExport = () => {
    const monthLabel = new Intl.DateTimeFormat("es-CL", {
      month: "long",
      year: "numeric",
      timeZone: "America/Santiago",
    }).format(new Date(`${monthParam}-01T12:00:00Z`));
    const monthParts = monthLabel.split(" ");
    const monthName = monthParts[0]
      ? monthParts[0].charAt(0).toUpperCase() + monthParts[0].slice(1)
      : "Mes";
    const monthYear = monthParts[2] || monthParts[1] || "";
    const monthTitle = `${monthName} ${monthYear}`.trim();
    const monthFileLabel = `${monthName}-${monthYear}`.trim();

    const wb = XLSX.utils.book_new();
    const monthlySheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(monthlySheet, [[`Métricas mensuales - ${monthTitle}`]], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(monthlySheet, [["Mes", "Entregas", "Monto CLP"]], { origin: "A2" });
    XLSX.utils.sheet_add_json(
      monthlySheet,
      monthlyData.map((row) => ({
        Mes: row.label,
        Entregas: row.entregas,
        "Monto CLP": row.monto,
      })),
      { origin: "A3", skipHeader: true },
    );

    const dailySheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(dailySheet, [[`Detalle diario - ${monthTitle}`]], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(dailySheet, [["Fecha", "Entregas", "Monto CLP"]], { origin: "A2" });
    XLSX.utils.sheet_add_json(
      dailySheet,
      dailyData.map((row) => ({
        Fecha: row.date,
        Entregas: row.entregas,
        "Monto CLP": row.monto,
      })),
      { origin: "A3", skipHeader: true },
    );

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

    monthlySheet["A1"].s = { font: { bold: true }, alignment: { horizontal: "left" } };
    monthlySheet["A2"].s = headerStyle;
    monthlySheet["B2"].s = headerStyle;
    monthlySheet["C2"].s = headerStyle;
    dailySheet["A1"].s = { font: { bold: true }, alignment: { horizontal: "left" } };
    dailySheet["A2"].s = headerStyle;
    dailySheet["B2"].s = headerStyle;
    dailySheet["C2"].s = headerStyle;

    monthlySheet["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 14 }];
    dailySheet["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 14 }];
    applyBorders(monthlySheet);
    applyBorders(dailySheet);

    XLSX.utils.book_append_sheet(wb, monthlySheet, `Mensual ${monthFileLabel}`);
    XLSX.utils.book_append_sheet(wb, dailySheet, `Detalle ${monthFileLabel}`);
    XLSX.writeFile(wb, `metricas_${monthFileLabel}.xlsx`);
  };

  return (
    <Button
      onClick={handleExport}
      className="h-10 rounded-lg bg-[#ffe3a3] text-slate-900 shadow-[var(--shadow-xs)] hover:bg-[#f6d48c]"
    >
      Exportar mes
    </Button>
  );
}
