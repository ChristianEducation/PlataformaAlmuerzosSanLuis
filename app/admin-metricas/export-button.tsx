"use client";

import * as XLSX from "xlsx-js-style";
import { Button } from "@/components/ui/button";

type DailyRow = {
  date: string;
  entregas: number;
};

type Props = {
  monthParam: string;
  monthTotal: number;
  dailyData: DailyRow[];
};

export function AdminMetricasExportButton({
  monthParam,
  monthTotal,
  dailyData,
}: Props) {
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
    const resumenSheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(resumenSheet, [[`Resumen mensual - ${monthTitle}`]], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(resumenSheet, [["Mes", "Entregas mes"]], { origin: "A2" });
    XLSX.utils.sheet_add_aoa(
      resumenSheet,
      [[monthTitle, monthTotal]],
      { origin: "A3" },
    );

    const dailySheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(dailySheet, [[`Detalle diario - ${monthTitle}`]], { origin: "A1" });
    XLSX.utils.sheet_add_aoa(dailySheet, [["Fecha", "Entregas"]], { origin: "A2" });
    XLSX.utils.sheet_add_json(
      dailySheet,
      dailyData.map((row) => ({
        Fecha: row.date,
        Entregas: row.entregas,
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

    resumenSheet["A1"].s = {
      font: { bold: true },
      alignment: { horizontal: "left" },
    };
    resumenSheet["A2"].s = headerStyle;
    resumenSheet["B2"].s = headerStyle;
    dailySheet["A1"].s = {
      font: { bold: true },
      alignment: { horizontal: "left" },
    };
    dailySheet["A2"].s = headerStyle;
    dailySheet["B2"].s = headerStyle;
    resumenSheet["!cols"] = [{ wch: 18 }, { wch: 16 }];
    dailySheet["!cols"] = [{ wch: 14 }, { wch: 12 }];
    applyBorders(resumenSheet);
    applyBorders(dailySheet);

    XLSX.utils.book_append_sheet(wb, resumenSheet, `Resumen ${monthFileLabel}`);
    XLSX.utils.book_append_sheet(wb, dailySheet, `Detalle ${monthFileLabel}`);
    XLSX.writeFile(wb, `casino_entregas_${monthFileLabel}.xlsx`);
  };

  return (
    <Button
      onClick={handleExport}
      className="h-9 min-w-[150px] rounded-lg bg-[#ffd85f] px-4 text-black shadow-[var(--shadow-xs)] hover:bg-[#f2c94c]"
    >
      Exportación mensual
    </Button>
  );
}
