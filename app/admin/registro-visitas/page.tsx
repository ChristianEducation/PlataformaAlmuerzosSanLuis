import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { RegistroVisitasScreen } from "./screen";
import { fetchRegistroVisitas } from "./services/registro-visitas.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

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

function toDateString(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return value.slice(0, 10);
}

export default async function RegistroVisitasPage({
  searchParams,
}: {
  searchParams: SearchParams | Promise<SearchParams>;
}) {
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

  const resolved = await searchParams;
  const today = todayInChileISO();

  const dateFrom = toDateString(resolved.desde as string | undefined, today);
  const dateTo = toDateString(resolved.hasta as string | undefined, today);
  const tipoRaw = (resolved.tipo as string | undefined) || "all";
  const tipo = tipoRaw === "slot" || tipoRaw === "real" ? tipoRaw : "all";
  const q = (resolved.q as string | undefined) || "";

  const { rows, errorMessage } = await fetchRegistroVisitas({ dateFrom, dateTo, tipo });

  return (
    <RegistroVisitasScreen
      initialRows={rows}
      initialFilters={{ dateFrom, dateTo, tipo, q }}
      errorMessage={errorMessage}
    />
  );
}
