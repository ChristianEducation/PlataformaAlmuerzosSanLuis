import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeNombreOficial(input: string) {
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

export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.rol !== "superadmin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const entregaId = Number(body.entregaId);
    if (!entregaId) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const rawNombre = body.nombreOficial;
    const nombreOficialRaw =
      rawNombre === null || rawNombre === undefined ? null : String(rawNombre);
    const nombreOficial = nombreOficialRaw
      ? normalizeNombreOficial(nombreOficialRaw) || null
      : null;

    const supabase = createSupabaseServerClient();
    if (nombreOficial) {
      const normalized = normalizeNombreOficial(nombreOficial);

      const { data: personas, error: personasError } = await supabase
        .from("personas")
        .select("nombre_completo");
      if (personasError) {
        console.error("Error validating nombre_oficial:", personasError);
        return NextResponse.json({ error: "No se pudo validar el nombre." }, { status: 500 });
      }
      const personaDuplicada =
        personas?.some(
          (row) => normalizeNombreOficial(row.nombre_completo).toLowerCase() === normalized.toLowerCase(),
        ) || false;
      if (personaDuplicada) {
        return NextResponse.json(
          { error: "Ese nombre ya está registrado en personas." },
          { status: 409 },
        );
      }

      const { data: existing, error: existingError } = await supabase
        .from("visitas_registro")
        .select("entrega_id, nombre_oficial")
        .neq("entrega_id", entregaId);
      if (existingError) {
        console.error("Error validating nombre_oficial:", existingError);
        return NextResponse.json({ error: "No se pudo validar el nombre." }, { status: 500 });
      }
      const yaUsado =
        existing?.some(
          (row) =>
            row.nombre_oficial &&
            normalizeNombreOficial(row.nombre_oficial).toLowerCase() === normalized.toLowerCase(),
        ) || false;
      if (yaUsado) {
        return NextResponse.json(
          { error: "Ese nombre ya está registrado en visitas." },
          { status: 409 },
        );
      }
    }
    const { data, error } = await supabase
      .from("visitas_registro")
      .upsert(
        { entrega_id: entregaId, nombre_oficial: nombreOficial, updated_at: new Date().toISOString() },
        { onConflict: "entrega_id" },
      )
      .select("entrega_id, nombre_oficial")
      .single();

    if (error) {
      console.error("Error updating visitas_registro:", error);
      return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
    }

    return NextResponse.json({ nombreOficial: data?.nombre_oficial ?? null }, { status: 200 });
  } catch (err) {
    console.error("PATCH registro visitas error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
