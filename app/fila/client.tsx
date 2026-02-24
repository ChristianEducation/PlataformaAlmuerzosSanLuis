"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/logout-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock, Search, Loader2, AlertCircle, CheckCircle2, Users } from "lucide-react";

type PersonaRow = {
  id: number;
  nombre: string;
  email: string | null;
  tipo: "funcionario" | "visita" | "reemplazo";
  entregadoAt?: string | null;
  entregadoAtLabel?: string | null;
};

type Props = {
  dateLabel: string;
  usuario: string;
  rol: "casino" | "admin" | "superadmin";
  initialPersonas: PersonaRow[];
  horarioConfig: {
    hora_inicio: string | null;
    hora_cierre: string | null;
    mensaje_cierre: string | null;
  };
};

function chileMinutesNow() {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date());
    const hh = parts.find((p) => p.type === "hour")?.value || "00";
    const mm = parts.find((p) => p.type === "minute")?.value || "00";
    return parseInt(hh, 10) * 60 + parseInt(mm, 10);
  } catch {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}

function toMinutes(value: string | null) {
  if (!value) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export function FilaClient({ dateLabel, usuario, rol, initialPersonas, horarioConfig }: Props) {
  const [query, setQuery] = useState("");
  const [personas, setPersonas] = useState<PersonaRow[]>(initialPersonas);
  const [selected, setSelected] = useState<PersonaRow | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const entregadosHoy = useMemo(
    () => personas.filter((p) => !!p.entregadoAt).length,
    [personas],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return personas;
    return personas.filter((p) => {
      return (
        p.nombre.toLowerCase().includes(term) ||
        (p.email ? p.email.toLowerCase().includes(term) : false)
      );
    });
  }, [query, personas]);

  const nowMinutes = chileMinutesNow();
  const startMinutes = toMinutes(horarioConfig.hora_inicio);
  const endMinutes = toMinutes(horarioConfig.hora_cierre);
  const fueraHorario =
    startMinutes !== null &&
    endMinutes !== null &&
    (nowMinutes < startMinutes || nowMinutes > endMinutes);
  const horarioLabel =
    startMinutes !== null && endMinutes !== null
      ? `${horarioConfig.hora_inicio} – ${horarioConfig.hora_cierre}`
      : null;

  const renderTipo = (tipo: PersonaRow["tipo"]) =>
    tipo.charAt(0).toUpperCase() + tipo.slice(1);

  useEffect(() => {
    const input = document.getElementById("search-persona");
    input?.focus();
  }, []);

  const entregar = async (persona: PersonaRow) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/entregas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personaId: persona.id }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "No se pudo registrar.");
          return;
        }
        const now = json.createdAt || new Date().toISOString();
        setPersonas((prev) =>
          prev.map((p) =>
            p.id === persona.id ? { ...p, entregadoAt: now } : p,
          ),
        );
        setSelected(null);
        setSuccessOpen(true);
      } catch (err) {
        console.error(err);
        setError("Error inesperado. Intenta nuevamente.");
      }
    });
  };

  useEffect(() => {
    if (!successOpen) return;
    const timer = setTimeout(() => setSuccessOpen(false), 2000);
    return () => clearTimeout(timer);
  }, [successOpen]);

  return (
    <div
      className="flex min-h-screen flex-col bg-transparent text-slate-900"
      style={{
        backgroundColor: "hsl(var(--background))",
        backgroundImage:
          "linear-gradient(135deg, rgba(15,23,42,0.04) 0%, rgba(255,216,95,0.08) 55%, rgba(255,255,255,0.7) 100%)",
      }}
    >
      <header className="sticky top-0 z-10 border-b border-[#f1f2f5] bg-white/55 shadow-[var(--shadow-xs)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 lg:px-8">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">Entrega de almuerzos</p>
            <div className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900">
              <span>{dateLabel}</span>
              <Badge variant="secondary" className="bg-[#f8f9fb] text-slate-700">
                Hoy
              </Badge>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-[#eeeff2] text-xs text-slate-700 sm:text-sm"
              >
                Usuario: {usuario}
              </Badge>
              <Badge className="border-[#eeeff2] text-xs font-semibold text-slate-700 sm:text-sm" variant="outline">
                Total entregados hoy: {entregadosHoy}
              </Badge>
            </div>
              <div className="flex flex-wrap items-center gap-2">
                {rol === "admin" ? (
                  <a
                    href="/admin-metricas"
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-[#eeeff2] px-3 text-sm font-semibold text-slate-700 shadow-[var(--shadow-xs)] transition hover:bg-slate-50"
                  >
                    Volver a Admin
                  </a>
                ) : null}
                {rol === "superadmin" ? (
                  <>
                    <a
                      href="/admin"
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-[#eeeff2] px-3 text-sm font-semibold text-slate-700 shadow-[var(--shadow-xs)] transition hover:bg-slate-50"
                    >
                      Volver a Superadmin
                    </a>
                    <a
                      href="/admin-metricas"
                      className="inline-flex h-9 items-center justify-center rounded-lg border border-[#eeeff2] px-3 text-sm font-semibold text-slate-700 shadow-[var(--shadow-xs)] transition hover:bg-slate-50"
                    >
                      Vista Admin
                    </a>
                  </>
                ) : null}
                <LogoutButton className="h-9 w-full justify-center border-[#eeeff2] text-slate-700 sm:w-auto" />
              </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="rounded-2xl cs-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 sm:text-xl">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff2cc] text-[#8a6a12]">
                  <Users className="h-4 w-4" />
                </span>
                Funcionarios y visitas
              </h2>
              <p className="text-xs text-slate-600 sm:text-sm">
                Busca por nombre o correo y registra la entrega con doble confirmación.
              </p>
              {horarioLabel ? (
                <Badge variant="outline" className="border-[#eeeff2] text-xs text-slate-600">
                  Horario permitido: {horarioLabel}
                </Badge>
              ) : null}
            </div>
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="search-persona"
                placeholder="Buscar por nombre o correo…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 rounded-lg border-[#eeeff2] bg-white pl-10 text-slate-900 placeholder:text-[#a4abb8] shadow-[var(--shadow-xs)] transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-[var(--accent-soft-hover)] focus-visible:ring-opacity-40 sm:h-11"
              />
            </div>
          </div>

          {fueraHorario ? (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{horarioConfig.mensaje_cierre || "Fuera de horario permitido."}</span>
            </div>
          ) : null}

          <div className="mt-4 overflow-hidden rounded-xl border border-[#f1f2f5]">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No encontramos personas con ese criterio.
              </div>
            ) : (
              filtered.map((persona, index) => {
                const entregado = !!persona.entregadoAt;
                return (
                  <div
                    key={persona.id}
                    className={`flex flex-col gap-3 px-3 py-3 transition-colors duration-150 sm:flex-row sm:items-center sm:justify-between sm:px-4 ${
                      index % 2 === 0 ? "bg-white" : "bg-[#f8f9fb]"
                    } ${entregado ? "opacity-80" : ""}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-medium text-slate-900">
                          {persona.nombre}
                        </span>
                        <Badge variant="outline" className="border-[#eeeff2] text-slate-600">
                          {renderTipo(persona.tipo)}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">{persona.email || "Sin correo"}</p>
                    </div>
                    <div className="flex w-full items-center gap-3 sm:w-auto sm:justify-end">
                      {entregado ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Lock className="h-4 w-4" />
                          <span>
                            Entregado · {persona.entregadoAtLabel || ""}
                          </span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setSelected(persona)}
                          disabled={isPending || fueraHorario}
                          className="w-full rounded-lg btn-accent transition-transform duration-150 hover:-translate-y-0.5 sm:w-auto"
                        >
                          Entregar
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error ? (
            <div className="mt-3 rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]">
              {error}
            </div>
          ) : null}
        </div>
      </main>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar entrega</DialogTitle>
            <DialogDescription>
              {selected
                ? `¿Confirmar entrega de almuerzo a ${selected.nombre} hoy?`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => selected && entregar(selected)}
              disabled={isPending || fueraHorario}
              className="btn-accent"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </span>
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-0 bg-white p-6 text-center shadow-[var(--shadow-card)]">
          <DialogHeader className="sr-only">
            <DialogTitle>Almuerzo entregado</DialogTitle>
            <DialogDescription>Se registró correctamente.</DialogDescription>
          </DialogHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 animate-[ping_0.8s_ease-in-out]" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Almuerzo entregado</h3>
          <p className="mt-1 text-sm text-slate-600">Se registró correctamente.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
