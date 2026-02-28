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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session || session.rol !== "superadmin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: Partial<PersonaDB> = {};

    if (body.nombre_completo !== undefined) {
      updates.nombre_completo = normalizeNombreCompleto(String(body.nombre_completo || ""));
      if (!updates.nombre_completo) {
        return NextResponse.json({ error: "Nombre es obligatorio." }, { status: 400 });
      }
    }
    if (body.email !== undefined) {
      const emailRaw = String(body.email || "").trim().toLowerCase();
      updates.email = emailRaw ? emailRaw : null;
    }
    if (body.tipo !== undefined) {
      const tipo = String(body.tipo || "");
      if (!allowedTipos.includes(tipo)) {
        return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
      }
      updates.tipo = tipo;
    }
    if (body.es_slot_visita !== undefined) {
      updates.es_slot_visita = Boolean(body.es_slot_visita);
    }
    if (body.fecha_inicio !== undefined) {
      updates.fecha_inicio = body.fecha_inicio || null;
    }
    if (body.fecha_fin !== undefined) {
      updates.fecha_fin = body.fecha_fin || null;
    }
    if (body.activo !== undefined) {
      updates.activo = Boolean(body.activo);
    }

    if (updates.fecha_inicio && updates.fecha_fin && updates.fecha_inicio > updates.fecha_fin) {
      return NextResponse.json(
        { error: "Fecha inicio no puede ser mayor a fecha fin." },
        { status: 400 },
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    if (updates.nombre_completo) {
      const { data: existing, error: existingError } = await supabase
        .from("personas")
        .select("id, nombre_completo")
        .neq("id", id);
      if (existingError) {
        console.error("Error validating nombre_completo:", existingError);
        return NextResponse.json({ error: "No se pudo validar el nombre." }, { status: 500 });
      }
      const normalized = updates.nombre_completo.toLowerCase();
      if (
        existing?.some(
          (row) => normalizeNombreCompleto(row.nombre_completo).toLowerCase() === normalized,
        )
      ) {
        return NextResponse.json({ error: "El nombre ya existe." }, { status: 409 });
      }
    }
    if (updates.tipo && updates.tipo !== "visita") {
      updates.es_slot_visita = false;
    }
    if (updates.es_slot_visita !== undefined && updates.tipo === undefined) {
      const { data: current, error: currentError } = await supabase
        .from("personas")
        .select("tipo")
        .eq("id", id)
        .single();
      if (currentError) {
        return NextResponse.json({ error: "No se pudo validar el tipo." }, { status: 500 });
      }
      if (current?.tipo !== "visita") {
        updates.es_slot_visita = false;
      }
    }
    const { data, error } = await supabase
      .from("personas")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "El email ya existe." }, { status: 409 });
      }
      console.error("Error updating persona:", error);
      return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
    }

    return NextResponse.json({ persona: buildPersonaResponse(data) }, { status: 200 });
  } catch (err) {
    console.error("PATCH persona error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session || session.rol !== "superadmin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("personas").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") {
        return NextResponse.json(
          { error: "No se puede eliminar: tiene entregas asociadas." },
          { status: 409 },
        );
      }
      console.error("Error deleting persona:", error);
      return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("DELETE persona error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
