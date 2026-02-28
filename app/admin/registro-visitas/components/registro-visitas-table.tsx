"use client";

import { Badge } from "@/components/ui/badge";
import type { RegistroVisitaRow } from "../types";
import { RegistroVisitasEditable } from "./registro-visitas-editable";

type SaveResult = { ok: boolean; value?: string | null; error?: string };

type Props = {
  rows: RegistroVisitaRow[];
  onSaveNombre: (entregaId: number, nombreOficial: string | null) => Promise<SaveResult>;
};

export function RegistroVisitasTable({ rows, onSaveNombre }: Props) {
  const renderEstado = (row: RegistroVisitaRow) => {
    const completo = !row.esSlotVisita || Boolean(row.nombreOficial);
    return (
      <Badge
        variant="outline"
        className={
          completo
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }
      >
        {completo ? "Completo" : "Pendiente de registro"}
      </Badge>
    );
  };

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-[#f1f2f5] text-sm">
          <thead className="bg-[#f8f9fb] text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Fecha</th>
              <th className="px-4 py-3 text-left font-semibold">Visita</th>
              <th className="px-4 py-3 text-left font-semibold">Nombre oficial</th>
              <th className="px-4 py-3 text-left font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f2f5] bg-white text-slate-900">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  No hay visitas para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const visitaLabel = row.esSlotVisita ? "Cupo de emergencia" : "Visita programada";
                const slotLabel = row.slotIndex ? `Visita ${row.slotIndex}` : "Visita";

                return (
                  <tr key={row.entregaId} className="hover:bg-[#f8f9fb]">
                    <td className="px-4 py-3 whitespace-nowrap">{row.fecha}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{visitaLabel}</div>
                    </td>
                    <td className="px-4 py-3">
                      {row.esSlotVisita ? (
                        <RegistroVisitasEditable
                          value={row.nombreOficial || slotLabel}
                          locked={Boolean(row.nombreOficial)}
                          onSave={(value) => onSaveNombre(row.entregaId, value)}
                        />
                      ) : (
                        <span className="text-sm text-slate-700">{row.personaNombre}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{renderEstado(row)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-[#f1f2f5] md:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            No hay visitas para los filtros seleccionados.
          </div>
        ) : (
          rows.map((row) => {
            const visitaLabel = row.esSlotVisita ? "Cupo de emergencia" : "Visita programada";
            const slotLabel = row.slotIndex ? `Visita ${row.slotIndex}` : "Visita";

            return (
              <div key={row.entregaId} className="space-y-3 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold text-slate-900">{visitaLabel}</div>
                  {renderEstado(row)}
                </div>
                <div className="text-xs text-slate-500">{row.fecha}</div>
                <div className="text-sm text-slate-700">
                  {row.esSlotVisita ? (
                    <RegistroVisitasEditable
                      value={row.nombreOficial || slotLabel}
                      locked={Boolean(row.nombreOficial)}
                      onSave={(value) => onSaveNombre(row.entregaId, value)}
                    />
                  ) : (
                    <span className="text-sm text-slate-700">{row.personaNombre}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
