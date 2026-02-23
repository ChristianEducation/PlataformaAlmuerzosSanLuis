import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTipos = ["funcionario", "visita", "reemplazo"];

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

type PersonaDB = {
  id: number;
  nombre_completo: string;
  email: string | null;
  tipo: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
};

function buildPersonaResponse(row: PersonaDB) {
  const today = todayInChileISO();
  const todayDate = new Date(`${today}T00:00:00`);
  let vigente = true;
  if (row.fecha_inicio) {
    const fi = new Date(`${row.fecha_inicio}T00:00:00`);
    if (fi > todayDate) vigente = false;
  }
  if (row.fecha_fin) {
    const ff = new Date(`${row.fecha_fin}T00:00:00`);
    if (ff < todayDate) vigente = false;
  }
  const vigenciaLabel = `${row.fecha_inicio || "—"} → ${row.fecha_fin || "—"}`;
  return {
    id: row.id,
    nombre_completo: row.nombre_completo,
    email: row.email,
    tipo: row.tipo,
    fecha_inicio: row.fecha_inicio,
    fecha_fin: row.fecha_fin,
    activo: row.activo,
    vigente,
    vigenciaLabel,
  };
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.rol !== "superadmin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const nombre_completo = String(body.nombre_completo || "").trim();
    const emailRaw = String(body.email || "").trim().toLowerCase();
    const email = emailRaw ? emailRaw : null;
    const tipo = String(body.tipo || "");
    const fecha_inicio = body.fecha_inicio || null;
    const fecha_fin = body.fecha_fin || null;
    const activo = body.activo !== false;

    if (!nombre_completo) {
      return NextResponse.json({ error: "Nombre es obligatorio." }, { status: 400 });
    }
    if (!allowedTipos.includes(tipo)) {
      return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
    }
    if (fecha_inicio && fecha_fin && fecha_inicio > fecha_fin) {
      return NextResponse.json({ error: "Fecha inicio no puede ser mayor a fecha fin." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("personas")
      .insert({
        nombre_completo,
        email,
        tipo,
        fecha_inicio,
        fecha_fin,
        activo,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "El email ya existe." }, { status: 409 });
      }
      console.error("Error inserting persona:", error);
      return NextResponse.json({ error: "No se pudo crear la persona." }, { status: 500 });
    }

    return NextResponse.json({ persona: buildPersonaResponse(data) }, { status: 200 });
  } catch (err) {
    console.error("POST persona error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
