import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTipos = ["funcionario", "visita", "reemplazo"];

function normalizeNombreCompleto(input: string) {
  const base = input.trim().replace(/\s+/g, " ");
  if (!base) return "";
  const withVisita = base.replace(/(^|\b)visita\s*(\d+)\b/gi, (match, prefix, num) =>
    `${prefix}Visita ${num}`.trimStart(),
  );
  const normalized = withVisita.replace(/\s+/g, " ").trim();
  return normalized
    .split(" ")
    .map((word) =>
      /^\d+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

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
  es_slot_visita: boolean;
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
    es_slot_visita: Boolean(row.es_slot_visita),
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
    const nombre_completo = normalizeNombreCompleto(String(body.nombre_completo || ""));
    const emailRaw = String(body.email || "").trim().toLowerCase();
    const email = emailRaw ? emailRaw : null;
    const tipo = String(body.tipo || "");
    const es_slot_visita = tipo === "visita" ? Boolean(body.es_slot_visita) : false;
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
    const { data: existing, error: existingError } = await supabase
      .from("personas")
      .select("id, nombre_completo");
    if (existingError) {
      console.error("Error validating nombre_completo:", existingError);
      return NextResponse.json({ error: "No se pudo validar el nombre." }, { status: 500 });
    }
    const normalized = nombre_completo.toLowerCase();
    if (
      existing?.some(
        (row) => normalizeNombreCompleto(row.nombre_completo).toLowerCase() === normalized,
      )
    ) {
      return NextResponse.json({ error: "El nombre ya existe." }, { status: 409 });
    }
    const { data, error } = await supabase
      .from("personas")
      .insert({
        nombre_completo,
        email,
        tipo,
        es_slot_visita,
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
