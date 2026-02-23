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

function formatDateChile(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session || session.rol !== "superadmin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const resolvedParams = await params;
  const id = Number(resolvedParams.id);
  if (!id) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: Partial<UsuarioDB> & { password_hash?: string } = {};

    if (body.rol !== undefined) {
      const rol = String(body.rol || "");
      if (!allowedRoles.includes(rol)) {
        return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
      }
      updates.rol = rol as "casino" | "admin" | "superadmin";
    }

    if (body.activo !== undefined) {
      updates.activo = Boolean(body.activo);
    }

    if (body.password !== undefined) {
      const pwd = String(body.password || "");
      if (!pwd) {
        return NextResponse.json({ error: "Contraseña vacía." }, { status: 400 });
      }
      updates.password_hash = await bcrypt.hash(pwd, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Sin cambios." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from("usuarios")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "El username ya existe." }, { status: 409 });
      }
      console.error("Error updating usuario:", error);
      return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
    }

    return NextResponse.json({ usuario: buildUsuarioResponse(data as UsuarioDB) }, { status: 200 });
  } catch (err) {
    console.error("PATCH usuario error:", err);
    return NextResponse.json({ error: "Error interno." }, { status: 500 });
  }
}
