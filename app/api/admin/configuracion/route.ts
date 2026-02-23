import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfigRow = {
  id?: number;
  hora_inicio: string | null;
  hora_cierre: string | null;
  mensaje_cierre: string | null;
  reporte_email: string | null;
  precio_almuerzo?: number | null;
};

function isValidTime(value: string | null) {
  if (!value) return true;
  return /^\d{2}:\d{2}$/.test(value);
}

function isValidEmail(value: string | null) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parsePrecio(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return "invalid";
  return num;
}

export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.rol !== "superadmin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<ConfigRow>;
    const hora_inicio = (body.hora_inicio ?? null) as string | null;
    const hora_cierre = (body.hora_cierre ?? null) as string | null;
    const mensaje_cierre = (body.mensaje_cierre ?? null) as string | null;
    const reporte_email = (body.reporte_email ?? null) as string | null;
    const precioParsed = parsePrecio(body.precio_almuerzo);

    if (!isValidTime(hora_inicio)) {
      return NextResponse.json({ error: "Hora inválida (HH:MM)." }, { status: 400 });
    }
    if (!isValidTime(hora_cierre)) {
      return NextResponse.json({ error: "Hora inválida (HH:MM)." }, { status: 400 });
    }
    if (!isValidEmail(reporte_email)) {
      return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
    }
    if (precioParsed === "invalid") {
      return NextResponse.json({ error: "Precio inválido." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from("configuracion")
      .upsert(
        {
          id: 1,
          hora_inicio,
          hora_cierre,
          mensaje_cierre,
          reporte_email,
          precio_almuerzo: precioParsed,
        },
        { onConflict: "id" },
      )
      .eq("id", 1);

    if (error) {
      console.error("Error upserting configuracion:", error);
      return NextResponse.json({ error: "No se pudo guardar la configuración." }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("PATCH configuracion error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
