import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { PersonasClient } from "./client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PersonaRow = {
  id: number;
  nombre_completo: string;
  email: string | null;
  tipo: "funcionario" | "visita" | "reemplazo";
  es_slot_visita: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
  vigente: boolean;
  vigenciaLabel: string;
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

function buildVigencia(fechaInicio: string | null, fechaFin: string | null, todayIso: string) {
  const today = new Date(`${todayIso}T00:00:00`);
  let vigente = true;
  if (fechaInicio) {
    const fi = new Date(`${fechaInicio}T00:00:00`);
    if (fi > today) vigente = false;
  }
  if (fechaFin) {
    const ff = new Date(`${fechaFin}T00:00:00`);
    if (ff < today) vigente = false;
  }
  const fiLabel = fechaInicio || "—";
  const ffLabel = fechaFin || "—";
  const vigenciaLabel = `${fiLabel} → ${ffLabel}`;
  return { vigente, vigenciaLabel };
}

export default async function AdminPersonasPage() {
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

  const supabase = createSupabaseServerClient();
  const todayIso = todayInChileISO();

  const { data, error } = await supabase
    .from("personas")
    .select("id, nombre_completo, email, tipo, es_slot_visita, fecha_inicio, fecha_fin, activo")
    .order("nombre_completo", { ascending: true });

  if (error) {
    console.error("Error fetching personas:", error);
  }

  const personas: PersonaRow[] =
    data?.map((p) => {
      const { vigente, vigenciaLabel } = buildVigencia(p.fecha_inicio, p.fecha_fin, todayIso);
      return {
        id: p.id,
        nombre_completo: p.nombre_completo,
        email: p.email,
        tipo: p.tipo as PersonaRow["tipo"],
        es_slot_visita: Boolean(p.es_slot_visita),
        fecha_inicio: p.fecha_inicio,
        fecha_fin: p.fecha_fin,
        activo: p.activo,
        vigente,
        vigenciaLabel,
      };
    }) || [];

  return <PersonasClient personas={personas} />;
}
