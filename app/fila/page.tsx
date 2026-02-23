import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { FilaClient } from "./client";

export const runtime = "nodejs";

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

type PersonaRecord = {
  id: number;
  nombre_completo: string;
  email: string | null;
  tipo: "funcionario" | "visita" | "reemplazo";
  activo: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
};

type EntregaRecord = {
  persona_id: number;
  created_at: string;
};

type ConfigRow = {
  hora_inicio: string | null;
  hora_cierre: string | null;
  mensaje_cierre: string | null;
};

function isVigente(persona: PersonaRecord, today: string) {
  if (!persona.activo) return false;
  if (persona.fecha_inicio && persona.fecha_inicio > today) return false;
  if (persona.fecha_fin && persona.fecha_fin < today) return false;
  return true;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimeLabel(iso: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Santiago",
    }).format(d);
  } catch {
    return "";
  }
}

export default async function FilaPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }
  if (session.rol !== "casino" && session.rol !== "admin" && session.rol !== "superadmin") {
    redirect("/login");
  }

  const supabase = createSupabaseServerClient();
  const todayIso = todayInChileISO();

  const [
    { data: personas, error: personasErr },
    { data: entregas, error: entregasErr },
    { data: config, error: configErr },
  ] = await Promise.all([
    supabase
      .from("personas")
      .select(
        "id, nombre_completo, email, tipo, activo, fecha_inicio, fecha_fin",
      ),
    supabase
      .from("entregas")
      .select("persona_id, created_at")
      .eq("fecha", todayIso),
    supabase
      .from("configuracion")
      .select("hora_inicio, hora_cierre, mensaje_cierre")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (personasErr || entregasErr || configErr) {
    console.error("fetch error", personasErr || entregasErr || configErr);
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-700">
            No se pudo cargar la información. Intenta nuevamente.
          </p>
        </div>
      </div>
    );
  }

  const entregasMap = new Map<number, string>();
  (entregas as EntregaRecord[] | null)?.forEach((e) => {
    entregasMap.set(e.persona_id, e.created_at);
  });

  const personasVigentes =
    (personas as PersonaRecord[] | null)?.filter((p) => isVigente(p, todayIso)) || [];

  const initialPersonas = personasVigentes.map((p) => ({
    id: p.id,
    nombre: p.nombre_completo,
    email: p.email,
    tipo: p.tipo,
    entregadoAt: entregasMap.get(p.id) || null,
    entregadoAtLabel: entregasMap.get(p.id)
      ? formatTimeLabel(entregasMap.get(p.id) as string)
      : null,
  }));

  return (
    <FilaClient
      dateLabel={formatDateLabel(new Date())}
      usuario={session.username}
      rol={session.rol}
      initialPersonas={initialPersonas}
      horarioConfig={{
        hora_inicio: (config as ConfigRow | null)?.hora_inicio || null,
        hora_cierre: (config as ConfigRow | null)?.hora_cierre || null,
        mensaje_cierre: (config as ConfigRow | null)?.mensaje_cierre || null,
      }}
    />
  );
}
