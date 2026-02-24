import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminMetricasFilterBar } from "./filter-bar";

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

function formatMonthLabel(isoMonth: string) {
  const d = new Date(`${isoMonth}-01T12:00:00Z`);
  return d.toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
    timeZone: "America/Santiago",
  });
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

function buildCalendarWeeks(isoMonth: string) {
  const first = `${isoMonth}-01`;
  const last = endOfMonth(isoMonth);
  const firstDate = new Date(first + "T00:00:00");
  const weekday = firstDate.getDay(); // 0=domingo
  const offset = weekday === 0 ? -6 : 1 - weekday; // lunes como inicio
  let cursor = addDays(first, offset);
  const weeks: string[][] = [];
  let currentWeek: string[] = [];

  while (cursor <= last || currentWeek.length > 0) {
    const dayIndex = new Date(cursor + "T00:00:00").getDay(); // 0=domingo
    if (dayIndex !== 0 && dayIndex !== 6) {
      currentWeek.push(cursor);
      if (currentWeek.length === 5) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    cursor = addDays(cursor, 1);
    if (cursor > last && currentWeek.length > 0 && currentWeek.length < 5) {
      while (currentWeek.length < 5) {
        const nextDayIndex = new Date(cursor + "T00:00:00").getDay();
        if (nextDayIndex !== 0 && nextDayIndex !== 6) {
          currentWeek.push(cursor);
        }
        cursor = addDays(cursor, 1);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  return weeks;
}

type SearchProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminMetricasLitePage({ searchParams }: SearchProps) {
  const params = await searchParams;
  const session = await getSessionFromCookies();
  if (!session || (session.rol !== "admin" && session.rol !== "superadmin")) {
    redirect("/login");
  }

  const todayChile = todayInChileISO();
  const monthParam = parseMonthParam(params.month) || todayChile.slice(0, 7);
  const monthOptions = getMonthOptions(6, todayChile);

  const monthStart = startOfMonth(monthParam);
  const monthEnd = endOfMonth(monthParam);

  const supabase = createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("entregas")
    .select("fecha")
    .gte("fecha", monthStart)
    .lte("fecha", monthEnd);

  if (error) {
    console.error("Error fetching admin metricas:", error);
  }

  const dayCounts = new Map<string, number>();
  (rows as CountRow[] | null)?.forEach((row) => {
    const fecha = row.fecha;
    dayCounts.set(fecha, (dayCounts.get(fecha) || 0) + 1);
  });

  const dailyData = buildMonthDays(monthParam).map((day) => ({
    date: day,
    entregas: dayCounts.get(day) || 0,
  }));

  const monthTotal = dailyData.reduce((acc, row) => acc + row.entregas, 0);
  const calendarWeeks = buildCalendarWeeks(monthParam);
  const isCurrentMonth = monthParam === todayChile.slice(0, 7);

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="cs-card">
        <CardHeader className="pb-2 pt-4 sm:pt-5">
          <AdminMetricasFilterBar
            monthParam={monthParam}
            monthOptions={monthOptions}
            monthTotal={monthTotal}
            dailyData={dailyData.map(({ date, entregas }) => ({ date, entregas }))}
          />
        </CardHeader>
      </Card>

      <Card className="cs-card">
        <CardHeader className="pb-2 pt-4 sm:pt-5">
          <CardTitle className="text-base font-semibold text-slate-900">
            Calendario mensual ({formatMonthLabel(monthParam)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:gap-1.5 sm:text-[11px]">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
          </div>
          <div className="mt-1 grid gap-1.5 sm:mt-2 sm:gap-2">
            {calendarWeeks.map((week) => {
              const isCurrentWeek =
                isCurrentMonth && week.some((day) => day === todayChile);
              return (
                <div
                  key={week[0]}
                  className={`grid grid-cols-5 gap-1.5 rounded-2xl p-1.5 sm:gap-2 sm:p-2 ${
                    isCurrentWeek ? "bg-amber-100/70" : ""
                  }`}
                >
                  {week.map((day) => {
                    const inMonth = day.startsWith(monthParam);
                    const isToday = isCurrentMonth && day === todayChile;
                    const entregas = inMonth ? dayCounts.get(day) || 0 : 0;
                    return (
                      <div
                        key={day}
                        className={`rounded-lg border px-2 py-1 text-left shadow-[var(--shadow-xs)] sm:py-1.5 ${
                          inMonth
                            ? "border-[#eeeff2] bg-white"
                            : "border-transparent bg-slate-100/60 text-slate-400"
                          } ${isToday ? "ring-2 ring-[var(--accent-soft-hover)]" : ""}`}
                      >
                        <p className="text-[10px] font-semibold text-slate-500 sm:text-[11px]">
                          {inMonth ? Number(day.slice(8, 10)) : ""}
                        </p>
                        <p className="mt-0.5 text-[13px] font-semibold text-slate-900 sm:text-sm">
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
  );
}
