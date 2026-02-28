"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RegistroVisitaFilters } from "../types";

type Props = {
  filters: RegistroVisitaFilters;
  onChange: (next: RegistroVisitaFilters) => void;
  onApply: () => void;
  onReset: () => void;
  totalCount?: number;
};

export function RegistroVisitasFilters({ filters, onChange, onApply, onReset, totalCount }: Props) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Búsqueda</p>
        <Input
          placeholder="Nombre real o nombre oficial"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Desde</p>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Hasta</p>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Tipo</p>
          <Select
            value={filters.tipo}
            onValueChange={(v) => onChange({ ...filters, tipo: v as RegistroVisitaFilters["tipo"] })}
          >
            <SelectTrigger className="h-10 rounded-lg border-[#eeeff2] bg-white text-left text-slate-900 shadow-[var(--shadow-xs)]">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="slot">Solo cupos de emergencia</SelectItem>
              <SelectItem value="real">Solo programadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onApply} className="h-10 w-full btn-accent sm:w-auto">
            Aplicar filtros
          </Button>
          <Button
            variant="outline"
            onClick={onReset}
            className="h-10 w-full border-[#eeeff2] sm:w-auto"
          >
            Limpiar
          </Button>
        </div>
        {typeof totalCount === "number" ? (
          <span className="rounded-full border border-[#eeeff2] bg-[#f8f9fb] px-3 py-1 text-xs font-semibold text-slate-600">
            Total: {totalCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}
