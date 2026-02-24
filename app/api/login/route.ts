import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "");

    if (!username || !password) {
      return NextResponse.json({ error: "Ingresa usuario y contraseña." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const { data: user, error } = await supabase
      .from("usuarios")
      .select("id, username, password_hash, rol, activo")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      console.error("Login query error", error);
      return NextResponse.json({ error: "No se pudo validar. Intenta nuevamente." }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Usuario o contraseña inválidos." }, { status: 401 });
    }

    if (!user.activo) {
      return NextResponse.json({ error: "Usuario inactivo. Contacta al administrador." }, { status: 403 });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return NextResponse.json({ error: "Usuario o contraseña inválidos." }, { status: 401 });
    }

    const { error: lastLoginError } = await supabase
      .from("usuarios")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);
    if (lastLoginError) {
      console.error("Error updating last_login_at:", lastLoginError);
    }

    const cookiePayload = createSessionCookie({
      userId: user.id,
      username: user.username,
      rol: user.rol,
    });

    const redirectTo =
      user.rol === "superadmin"
        ? "/admin"
        : user.rol === "admin"
          ? "/admin-metricas"
          : "/fila";

    const res = NextResponse.json({
      ok: true,
      redirectTo,
    });

    res.cookies.set({
      name: "session",
      value: cookiePayload,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12, // 12h
    });

    return res;
  } catch (err) {
    console.error("Login route error", err);
    return NextResponse.json({ error: "Error inesperado." }, { status: 500 });
  }
}
