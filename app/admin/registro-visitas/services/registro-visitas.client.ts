export async function updateNombreOficial(entregaId: number, nombreOficial: string | null) {
  const res = await fetch("/api/admin/registro-visitas", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entregaId, nombreOficial }),
  });
  const data = await res.json();
  if (!res.ok) {
    const message =
      data.error ||
      (res.status === 409
        ? "Ese nombre ya está registrado para este día."
        : "No se pudo guardar.");
    return { ok: false, error: message };
  }
  return { ok: true, value: data.nombreOficial ?? null };
}
