import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { EntregasClient } from "./client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

type EntregaRow = {
  id: number;
  fecha: string;
  horaLabel: string;
  personaNombre: string;
  personaEmail: string | null;
  usuario: string;
};

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

function formatHoraChile(iso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(iso));
}

function toDateString(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return value.slice(0, 10);
}

export default async function AdminEntregasPage({
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

  const resolvedSearchParams = await searchParams;

  const supabase = createSupabaseServerClient();
  const today = todayInChileISO();
  const q = (resolvedSearchParams.q as string | undefined)?.trim().toLowerCase() || "";
  const hasDateParams = Boolean(resolvedSearchParams.desde || resolvedSearchParams.hasta);
  const dateFrom = hasDateParams || !q
    ? toDateString(resolvedSearchParams.desde as string | undefined, today)
    : "";
  const dateTo = hasDateParams || !q
    ? toDateString(resolvedSearchParams.hasta as string | undefined, today)
    : "";

  let query = supabase
    .from("entregas")
    .select(
      `
      id,
      fecha,
      created_at,
      persona:persona_id (id, nombre_completo, email),
      usuario:creado_por_usuario_id (username)
    `,
    )
    .order("created_at", { ascending: false });
  if (dateFrom) {
    query = query.gte("fecha", dateFrom);
  }
  if (dateTo) {
    query = query.lte("fecha", dateTo);
  }

  const { data: entregasData, error: entregasError } = await query;
  if (entregasError) {
    console.error("Error fetching entregas:", entregasError);
  }
  const errorMessage = entregasError ? "No se pudieron cargar las entregas." : null;

  let rows: EntregaRow[] =
    entregasData?.map((row) => {
      const persona = Array.isArray(row.persona) ? row.persona[0] : row.persona;
      const usuario = Array.isArray(row.usuario) ? row.usuario[0] : row.usuario;
      return {
        id: row.id,
        fecha: row.fecha,
        horaLabel: formatHoraChile(row.created_at),
        personaNombre: persona?.nombre_completo || "Sin nombre",
        personaEmail: persona?.email || null,
        usuario: usuario?.username || "—",
      };
    }) || [];

  if (q) {
    rows = rows.filter(
      (r) =>
        r.personaNombre.toLowerCase().includes(q) ||
        (r.personaEmail ? r.personaEmail.toLowerCase().includes(q) : false),
    );
  }

  return (
    <EntregasClient
      rows={rows}
      initialFilters={{ dateFrom, dateTo, q }}
      errorMessage={errorMessage}
    />
  );
}
