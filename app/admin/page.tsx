import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BarChart3, CalendarClock, TrendingUp } from "lucide-react";

export const runtime = "nodejs";

type CountRow = { fecha: string };

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

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay(); // 0=domingo
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(isoMonth: string) {
  return `${isoMonth}-01`;
}

function endOfMonth(isoMonth: string) {
  const [y, m] = isoMonth.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0));
  const y2 = last.getUTCFullYear();
  const m2 = String(last.getUTCMonth() + 1).padStart(2, "0");
  const d2 = String(last.getUTCDate()).padStart(2, "0");
  return `${y2}-${m2}-${d2}`;
}

function formatDateRangeLabel(startIso: string, endIso: string) {
  const start = new Date(startIso + "T12:00:00Z");
  const end = new Date(endIso + "T12:00:00Z");
  const fmt = new Intl.DateTimeFormat("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Santiago",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function formatWeekdayLabel(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  return d.toLocaleDateString("es-CL", { weekday: "short" });
}

type SearchProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminDashboard({ searchParams }: SearchProps) {
  await searchParams;
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  if (session.rol === "admin") {
    redirect("/admin-metricas");
  }
  if (session.rol !== "superadmin") {
    redirect("/fila");
  }

  const todayChile = todayInChileISO();
  const monthParam = todayChile.slice(0, 7);
  const dayParam = todayChile;

  const weekStart = startOfWeekMonday(dayParam);
  const weekEnd = addDays(weekStart, 4); // lunes a viernes
  const monthStart = startOfMonth(monthParam);
  const monthEnd = endOfMonth(monthParam);

  const supabase = createSupabaseServerClient();

  const [dayCount, weekRows, monthRows] = await Promise.all([
    supabase
      .from("entregas")
      .select("id", { head: true, count: "exact" })
      .eq("fecha", dayParam)
      .then((r) => r.count || 0),
    supabase
      .from("entregas")
      .select("fecha")
      .gte("fecha", weekStart)
      .lte("fecha", weekEnd)
      .then((r) => (r.data as CountRow[] | null) || []),
    supabase
      .from("entregas")
      .select("fecha")
      .gte("fecha", monthStart)
      .lte("fecha", monthEnd)
      .then((r) => (r.data as CountRow[] | null) || []),
  ]);

  // Semana (lu–vie)
  const weekCounts = new Map<string, number>();
  weekRows.forEach((row) => {
    weekCounts.set(row.fecha, (weekCounts.get(row.fecha) || 0) + 1);
  });
  const weekDays = Array.from({ length: 5 }).map((_, idx) => {
    const iso = addDays(weekStart, idx);
    return { iso, label: formatWeekdayLabel(iso), value: weekCounts.get(iso) || 0 };
  });
  const weekTotal = weekDays.reduce((acc, d) => acc + d.value, 0);
  const weekMax = Math.max(1, ...weekDays.map((d) => d.value));

  // Mes
  const monthCount = monthRows.length;
  const daysInMonth = Number(monthEnd.slice(8, 10));
  const monthAvg = daysInMonth ? Math.round((monthCount / daysInMonth) * 100) / 100 : 0;

  // Semanas del mes (4-5 barras)
  const monthDayCounts = new Map<string, number>();
  monthRows.forEach((row) => {
    monthDayCounts.set(row.fecha, (monthDayCounts.get(row.fecha) || 0) + 1);
  });

  const monthWeeks: { label: string; value: number }[] = [];
  // Anclar al lunes de la semana que contiene el primer día del mes
  const firstWeekStart = startOfWeekMonday(monthStart);
  let cursor = firstWeekStart;
  while (cursor <= monthEnd) {
    const weekStartIso = cursor;
    const weekEndIso = addDays(cursor, 4); // lunes a viernes
    let sum = 0;
    for (let i = 0; i < 5; i++) {
      const dIso = addDays(cursor, i);
      if (dIso >= monthStart && dIso <= monthEnd) {
        sum += monthDayCounts.get(dIso) || 0;
      }
    }
    const fromDay =
      weekStartIso < monthStart ? monthStart.slice(8, 10) : weekStartIso.slice(8, 10);
    const toDay = weekEndIso > monthEnd ? monthEnd.slice(8, 10) : weekEndIso.slice(8, 10);
    const label = `${fromDay}–${toDay}`;
    monthWeeks.push({ label, value: sum });
    cursor = addDays(cursor, 7);
  }
  const monthWeekMax = Math.max(1, ...monthWeeks.map((w) => w.value));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          Dashboard
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Resumen operativo</h1>
            <p className="text-sm text-slate-600">
              Métricas diarias, semanales (lu–vie) y mensuales según el rango seleccionado.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[#f1f2f5] bg-white/90 shadow-[0_6px_24px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-slate-500">
                Entregas del día
              </CardTitle>
              <p className="text-sm text-slate-500">Fecha: {dayParam}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
              <CalendarClock className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{dayCount}</div>
          </CardContent>
        </Card>

        <Card className="border-[#f1f2f5] bg-white/90 shadow-[0_6px_24px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-slate-500">
                Total mes (entregas)
              </CardTitle>
              <p className="text-sm text-slate-500">{monthParam}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
              <BarChart3 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{monthCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[#f1f2f5] bg-white/90 shadow-[0_6px_24px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-slate-500">
                Semana (lu–vie)
              </CardTitle>
              <p className="text-sm text-slate-500">
                {formatDateRangeLabel(weekStart, weekEnd)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-slate-900">{weekTotal}</div>
            <div className="mt-3 flex items-end gap-2 sm:gap-3">
              {weekDays.map((day) => (
                <div key={day.iso} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-12 w-full items-end rounded-md bg-slate-100 sm:h-16">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-[#f6d48c] to-[#ffe3a3] transition-all"
                      style={{ height: `${(day.value / weekMax) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 sm:text-xs">
                    {day.label}
                  </span>
                  <span className="text-[11px] text-slate-600 sm:text-xs">{day.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#f1f2f5] bg-white/90 shadow-[0_6px_24px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(15,23,42,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-slate-500">
                Entregas mes
              </CardTitle>
              <p className="text-sm text-slate-500">
                Rango: {formatDateRangeLabel(monthStart, monthEnd)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
              <BarChart3 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold text-slate-900">{monthCount}</div>
            <p className="text-xs text-slate-500">
              Promedio diario: {monthAvg} / día
            </p>
            <div className="mt-2 flex items-end gap-2">
              {monthWeeks.map((w, idx) => (
                <div key={`${w.label}-${idx}`} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-12 w-full items-end rounded-md bg-slate-100 sm:h-16">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-[#f6d48c] to-[#ffe3a3] transition-all"
                      style={{ height: `${(w.value / monthWeekMax) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">{w.label}</span>
                  <span className="text-[11px] text-slate-600 sm:text-xs">{w.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
