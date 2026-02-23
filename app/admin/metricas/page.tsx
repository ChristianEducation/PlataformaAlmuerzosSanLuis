import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BarChart3, CalendarClock, TrendingUp } from "lucide-react";
import { MetricasFilterBar } from "./filter-bar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function parseMonthParam(sp: string | string[] | undefined) {
  const v = Array.isArray(sp) ? sp[0] : sp;
  if (!v) return null;
  if (!/^\d{4}-\d{2}$/.test(v)) return null;
  return v;
}

function addDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
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

function buildMonthDays(isoMonth: string) {
  const end = endOfMonth(isoMonth);
  const lastDay = Number(end.slice(8, 10));
  return Array.from({ length: lastDay }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    return `${isoMonth}-${d}`;
  });
}

function buildCalendarWeeks(isoMonth: string) {
  const first = `${isoMonth}-01`;
  const firstDate = new Date(first + "T00:00:00");
  const weekday = firstDate.getDay(); // 0=domingo
  const offset = weekday === 0 ? -6 : 1 - weekday; // lunes como inicio
  const start = addDays(first, offset);
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(addDays(start, w * 7 + d));
    }
    weeks.push(week);
  }
  return weeks;
}

function formatMonthLabel(isoMonth: string) {
  const d = new Date(`${isoMonth}-01T12:00:00Z`);
  return d.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}

function formatDayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Santiago",
  });
}

function shiftMonth(isoMonth: string, delta: number) {
  const [y, m] = isoMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  const y2 = d.getUTCFullYear();
  const m2 = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y2}-${m2}`;
}

function getMonthOptions(count = 6, baseDayIso: string) {
  const base = new Date(baseDayIso + "T00:00:00");
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const value = `${y}-${m}`;
    const label = formatMonthLabel(value);
    options.push({ value, label });
  }
  return options;
}

type SearchProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminMetricasPage({ searchParams }: SearchProps) {
  const params = await searchParams;
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
  const monthParam = parseMonthParam(params.month) || todayChile.slice(0, 7);
  const monthOptions = getMonthOptions(6, todayChile);

  const earliestMonth = monthOptions[monthOptions.length - 1]?.value || monthParam;
  const rangeStart = startOfMonth(earliestMonth);
  const rangeEnd = endOfMonth(monthOptions[0]?.value || monthParam);

  const supabase = createSupabaseServerClient();
  const [{ data: config }, { data: rows, error }] = await Promise.all([
    supabase.from("configuracion").select("precio_almuerzo").eq("id", 1).maybeSingle(),
    supabase.from("entregas").select("fecha").gte("fecha", rangeStart).lte("fecha", rangeEnd),
  ]);

  if (error) {
    console.error("Error fetching metricas:", error);
  }

  const precio = Number(config?.precio_almuerzo ?? 4275);

  const monthCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();
  (rows as CountRow[] | null)?.forEach((row) => {
    const fecha = row.fecha;
    const month = fecha.slice(0, 7);
    monthCounts.set(month, (monthCounts.get(month) || 0) + 1);
    if (month === monthParam) {
      dayCounts.set(fecha, (dayCounts.get(fecha) || 0) + 1);
    }
  });

  const monthlyData = monthOptions.map((opt) => {
    const entregas = monthCounts.get(opt.value) || 0;
    return {
      month: opt.value,
      label: opt.label,
      entregas,
      monto: entregas * precio,
    };
  });

  const dailyData = buildMonthDays(monthParam).map((day) => {
    const entregas = dayCounts.get(day) || 0;
    return {
      date: day,
      label: formatDayLabel(day),
      entregas,
      monto: entregas * precio,
    };
  });

  const monthTotal = monthCounts.get(monthParam) || 0;
  const montoTotal = monthTotal * precio;
  const maxMonth = Math.max(1, ...monthlyData.map((d) => d.entregas));

  const calendarWeeks = buildCalendarWeeks(monthParam);
  const dailyCounts = new Map(dailyData.map((d) => [d.date, d.entregas]));

  const currentMonth = todayChile.slice(0, 7);
  const isCurrentMonth = monthParam === currentMonth;
  const daysInMonth = dailyData.length;
  const elapsedDays = isCurrentMonth ? Number(todayChile.slice(8, 10)) : daysInMonth;
  const projectedEntregas =
    isCurrentMonth && elapsedDays > 0
      ? Math.round((monthTotal / elapsedDays) * daysInMonth)
      : monthTotal;
  const projectedMonto = projectedEntregas * precio;

  const clp = new Intl.NumberFormat("es-CL");
  const prevMonth = shiftMonth(currentMonth, -1);
  const prevPrevMonth = shiftMonth(currentMonth, -2);
  const prevMonthMonto = (monthCounts.get(prevMonth) || 0) * precio;
  const prevPrevMonthMonto = (monthCounts.get(prevPrevMonth) || 0) * precio;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          Métricas
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Análisis mensual</h1>
            <p className="text-sm text-slate-600">
              Comportamiento mensual y proyección del mes en curso.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-[#eeeff2] shadow-[var(--shadow-card)]">
        <CardHeader className="space-y-2">
          <MetricasFilterBar
            monthParam={monthParam}
            monthOptions={monthOptions}
            monthlyData={monthlyData}
            dailyData={dailyData}
          />
        </CardHeader>
      </Card>

      <div className="grid gap-2 lg:grid-cols-3">
        <Card className="border-[#eeeff2] shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center gap-3 py-4">
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Entregas</p>
              <CardTitle className="text-base font-semibold text-slate-900">
                Mes seleccionado
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-slate-900">{monthTotal}</p>
            <p className="text-xs text-slate-500">{formatMonthLabel(monthParam)}</p>
          </CardContent>
        </Card>

        <Card className="border-[#eeeff2] shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center gap-3 py-4">
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Monto</p>
              <CardTitle className="text-base font-semibold text-slate-900">
                Total del mes
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-slate-900">${clp.format(montoTotal)}</p>
            <p className="text-xs text-slate-500">
              Precio almuerzo ${clp.format(precio)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#eeeff2] shadow-[var(--shadow-card)]">
          <CardHeader className="flex flex-row items-center gap-3 py-4">
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Proyección</p>
              <CardTitle className="text-base font-semibold text-slate-900">
                Mes en curso
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-2xl font-semibold text-slate-900">{projectedEntregas}</p>
            <p className="text-xs text-slate-500">
              ${clp.format(projectedMonto)} · {isCurrentMonth ? "Estimado" : "Cerrado"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-2 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-[#eeeff2] shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Comparativo últimos meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 items-end gap-3">
              {monthlyData.map((item) => (
                <div key={item.month} className="space-y-2 text-center">
                  <div className="flex h-28 items-end justify-center">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-[#ffd85f] to-[#f2c94c] transition-all"
                      style={{ height: `${(item.entregas / maxMonth) * 100}%` }}
                      title={`${item.entregas} entregas`}
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-600">
                    {item.label.split(" ")[0]}
                  </p>
                  <p className="text-xs text-slate-500">{item.entregas}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 rounded-xl border border-[#eeeff2] bg-[#f8f9fb] p-3 text-sm text-slate-700 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {formatMonthLabel(prevPrevMonth)}
                </p>
                <p className="text-sm text-slate-700">${clp.format(prevPrevMonthMonto)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {formatMonthLabel(prevMonth)}
                </p>
                <p className="text-sm text-slate-700">${clp.format(prevMonthMonto)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  {formatMonthLabel(currentMonth)}
                </p>
                <p className="text-sm text-slate-700">${clp.format(projectedMonto)}</p>
                <p className="text-xs text-slate-500">Proyección</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#eeeff2] shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Entregas por día ({formatMonthLabel(monthParam)})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
            </div>
            <div className="mt-1.5 grid gap-2">
              {calendarWeeks.map((week) => {
                const isCurrentWeek =
                  isCurrentMonth && week.some((day) => day === todayChile);
                const weekDays = week.slice(0, 5);
                return (
                  <div
                    key={week[0]}
                    className={`grid grid-cols-5 gap-2 rounded-2xl p-1.5 ${
                      isCurrentWeek ? "bg-amber-100/70" : ""
                    }`}
                  >
                    {weekDays.map((day) => {
                      const inMonth = day.startsWith(monthParam);
                      const isToday = isCurrentMonth && day === todayChile;
                      const entregas = inMonth ? dailyCounts.get(day) || 0 : 0;
                      return (
                        <div
                          key={day}
                          className={`rounded-lg border px-2 py-1.5 text-left shadow-[var(--shadow-xs)] ${
                            inMonth
                              ? "border-[#eeeff2] bg-white"
                              : "border-transparent bg-slate-100/60 text-slate-400"
                          } ${isToday ? "ring-2 ring-[#ffd85f]" : ""}`}
                        >
                          <p className="text-[10px] font-semibold text-slate-400">
                            {inMonth ? day.slice(8, 10) : ""}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-900">
                            {inMonth ? entregas : ""}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
