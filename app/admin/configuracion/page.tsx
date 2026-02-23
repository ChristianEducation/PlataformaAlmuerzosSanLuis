import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionFromCookies } from "@/lib/auth/session";
import { ConfiguracionClient } from "./client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfigRow = {
  hora_inicio: string | null;
  hora_cierre: string | null;
  mensaje_cierre: string | null;
  reporte_email: string | null;
  precio_almuerzo: number | null;
};

export default async function ConfiguracionPage() {
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
    .from("configuracion")
    .select("hora_inicio, hora_cierre, mensaje_cierre, reporte_email, precio_almuerzo")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching configuracion:", error);
  }

  const config: ConfigRow = {
    hora_inicio: data?.hora_inicio ?? "",
    hora_cierre: data?.hora_cierre ?? "",
    mensaje_cierre: data?.mensaje_cierre ?? "",
    reporte_email: data?.reporte_email ?? "",
    precio_almuerzo: data?.precio_almuerzo ?? 4275,
  };

  return <ConfiguracionClient initialConfig={config} />;
}
