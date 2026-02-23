import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSessionFromCookies } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UsuarioDB = {
  id: number;
  username: string;
  rol: "casino" | "admin" | "superadmin";
  activo: boolean;
  created_at: string;
  last_login_at: string | null;
};

const allowedRoles = ["casino", "admin", "superadmin"];

function buildUsuarioResponse(row: UsuarioDB) {
  return {
    id: row.id,
    username: row.username,
    rol: row.rol,
    activo: row.activo,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
    createdLabel: formatDateChile(row.created_at),
    lastLoginLabel: formatDateChile(row.last_login_at),
  };
}

function formatDateChile(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.rol !== "superadmin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rol = String(body.rol || "");
    const activo = body.activo !== false;

    if (!username || !password) {
      return NextResponse.json({ error: "Username y contraseña son obligatorios." }, { status: 400 });
    }
    if (!allowedRoles.includes(rol)) {
      return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("usuarios")
      .insert({
        username,
        password_hash,
        rol,
        activo,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "El username ya existe." }, { status: 409 });
      }
      console.error("Error creating usuario:", error);
      return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 500 });
    }

    return NextResponse.json({ usuario: buildUsuarioResponse(data as UsuarioDB) }, { status: 200 });
  } catch (err) {
    console.error("POST usuario error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
