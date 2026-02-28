import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RegistroVisitaRow } from "../types";

export type RegistroVisitasQuery = {
  dateFrom: string;
  dateTo: string;
  tipo: "all" | "slot" | "real";
};

export async function fetchRegistroVisitas({ dateFrom, dateTo, tipo }: RegistroVisitasQuery) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("entregas")
    .select(
      `
      id,
      fecha,
      created_at,
      persona:persona_id!inner (id, nombre_completo, tipo, es_slot_visita),
      registro:visitas_registro (nombre_oficial)
    `,
    )
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .eq("persona.tipo", "visita");

  if (dateFrom) query = query.gte("fecha", dateFrom);
  if (dateTo) query = query.lte("fecha", dateTo);
  if (tipo === "slot") query = query.eq("persona.es_slot_visita", true);
  if (tipo === "real") query = query.eq("persona.es_slot_visita", false);

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching registro visitas:", error);
    return { rows: [] as RegistroVisitaRow[], errorMessage: "No se pudieron cargar las visitas." };
  }

  const rows: RegistroVisitaRow[] =
    (data as any[] | null)?.map((row) => {
      const persona = Array.isArray(row.persona) ? row.persona[0] : row.persona;
      const registro = Array.isArray(row.registro) ? row.registro[0] : row.registro;
      return {
        entregaId: row.id,
        fecha: row.fecha,
        createdAt: row.created_at,
        personaNombre: persona?.nombre_completo || "Sin nombre",
        esSlotVisita: Boolean(persona?.es_slot_visita),
        nombreOficial: registro?.nombre_oficial || null,
        slotIndex: null,
      };
    }) || [];

  const slotsByDate = new Map<string, RegistroVisitaRow[]>();
  rows.forEach((row) => {
    if (!row.esSlotVisita) return;
    const list = slotsByDate.get(row.fecha) ?? [];
    list.push(row);
    slotsByDate.set(row.fecha, list);
  });
  slotsByDate.forEach((list) => {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    list.forEach((row, idx) => {
      row.slotIndex = idx + 1;
    });
  });

  return { rows, errorMessage: null };
}
