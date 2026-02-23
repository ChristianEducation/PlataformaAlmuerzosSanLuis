import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { UsuariosClient } from "./client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UsuarioRow = {
  id: number;
  username: string;
  rol: "casino" | "admin" | "superadmin";
  activo: boolean;
  created_at: string;
  last_login_at: string | null;
  createdLabel: string;
  lastLoginLabel: string;
};

function formatDateChile(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function AdminUsuariosPage() {
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
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, username, rol, activo, created_at, last_login_at")
    .order("username", { ascending: true });

  if (error) {
    console.error("Error fetching usuarios:", error);
  }

  const usuarios: UsuarioRow[] =
    data?.map((u) => ({
      id: u.id,
      username: u.username,
      rol: u.rol as "casino" | "admin" | "superadmin",
      activo: u.activo,
      created_at: u.created_at,
      last_login_at: u.last_login_at,
      createdLabel: formatDateChile(u.created_at),
      lastLoginLabel: formatDateChile(u.last_login_at),
    })) || [];

  return <UsuariosClient usuarios={usuarios} />;
}
