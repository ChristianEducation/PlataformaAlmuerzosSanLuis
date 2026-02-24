"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2, MoreHorizontal } from "lucide-react";

type Persona = {
  id: number;
  nombre_completo: string;
  email: string | null;
  tipo: "funcionario" | "visita" | "reemplazo";
  fecha_inicio: string | null;
  fecha_fin: string | null;
  activo: boolean;
  vigente: boolean;
  vigenciaLabel: string;
};

type Props = {
  personas: Persona[];
};

type FormState = {
  id?: number;
  nombre_completo: string;
  email: string;
  tipo: Persona["tipo"];
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
};

const tipoOptions: Persona["tipo"][] = ["funcionario", "visita", "reemplazo"];

export function PersonasClient({ personas }: Props) {
  const [items, setItems] = useState<Persona[]>(personas);
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<Persona["tipo"] | "all">("all");
  const [estadoFilter, setEstadoFilter] = useState<"all" | "activo" | "inactivo">("activo");
  const [vigenciaFilter, setVigenciaFilter] = useState<"all" | "vigente" | "novigente">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{ message: string; visible: boolean } | null>(
    null,
  );
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const [actionAnchorEl, setActionAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [form, setForm] = useState<FormState>({
    nombre_completo: "",
    email: "",
    tipo: "funcionario",
    fecha_inicio: "",
    fecha_fin: "",
    activo: true,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((p) => {
      if (tipoFilter !== "all" && p.tipo !== tipoFilter) return false;
      if (estadoFilter === "activo" && !p.activo) return false;
      if (estadoFilter === "inactivo" && p.activo) return false;
      if (vigenciaFilter === "vigente" && !p.vigente) return false;
      if (vigenciaFilter === "novigente" && p.vigente) return false;
      if (!term) return true;
      return (
        p.nombre_completo.toLowerCase().includes(term) ||
        (p.email ? p.email.toLowerCase().includes(term) : false)
      );
    });
  }, [items, search, tipoFilter, estadoFilter, vigenciaFilter]);

  useEffect(() => {
    if (!successToast) return;
    const hideTimer = setTimeout(() => {
      setSuccessToast((prev) => (prev ? { ...prev, visible: false } : prev));
    }, 2500);
    const clearTimer = setTimeout(() => {
      setSuccessToast(null);
    }, 3000);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(clearTimer);
    };
  }, [successToast]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const clickedMenu = actionMenuRef.current?.contains(target);
      const clickedAnchor = actionAnchorEl?.contains(target);
      if (!clickedMenu && !clickedAnchor) {
        setOpenActionId(null);
        setActionAnchorEl(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionId(null);
        setActionAnchorEl(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!openActionId || !actionAnchorEl) return;
    const padding = 8;
    const gap = 8;

    const updatePosition = () => {
      const rect = actionAnchorEl.getBoundingClientRect();
      const menuRect = actionMenuRef.current?.getBoundingClientRect();
      const menuWidth = menuRect?.width || 160;
      const menuHeight = menuRect?.height || 140;

      let top = rect.bottom + gap;
      if (top + menuHeight > window.innerHeight - padding) {
        top = rect.top - menuHeight - gap;
      }
      if (top < padding) top = padding;

      let left = rect.right - menuWidth;
      if (left + menuWidth > window.innerWidth - padding) {
        left = window.innerWidth - menuWidth - padding;
      }
      if (left < padding) left = padding;

      setMenuPosition({ top, left });
    };

    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [openActionId, actionAnchorEl]);

  const renderActionsMenu = (p: Persona) => {
    const isOpen = openActionId === p.id;
    return (
      <div className="relative inline-flex">
        <button
          type="button"
          onClick={(event) => {
            const btn = event.currentTarget as HTMLButtonElement;
            setActionAnchorEl(btn);
            setOpenActionId(isOpen ? null : p.id);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#eeeff2] text-slate-600 shadow-[var(--shadow-xs)] transition hover:bg-slate-50"
          aria-label="Acciones"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {isOpen && menuPosition
          ? createPortal(
              <div
                ref={actionMenuRef}
                className="fixed z-50 w-36 rounded-xl border border-[#f1f2f5] bg-white/95 p-2 shadow-[0_6px_24px_rgba(15,23,42,0.08)]"
                style={{ top: menuPosition.top, left: menuPosition.left }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionId(null);
                    openEdit(p);
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionId(null);
                    handleToggleActivo(p);
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {p.activo ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionId(null);
                    handleDelete(p);
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-[var(--error)] hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  };

  const openCreate = () => {
    setForm({
      id: undefined,
      nombre_completo: "",
      email: "",
      tipo: "funcionario",
      fecha_inicio: "",
      fecha_fin: "",
      activo: true,
    });
    setError(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEdit = (p: Persona) => {
    setForm({
      id: p.id,
      nombre_completo: p.nombre_completo,
      email: p.email || "",
      tipo: p.tipo,
      fecha_inicio: p.fecha_inicio || "",
      fecha_fin: p.fecha_fin || "",
      activo: p.activo,
    });
    setError(null);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setModalError(null);
    try {
      const payload = {
        nombre_completo: form.nombre_completo.trim(),
        email: form.email.trim() || null,
        tipo: form.tipo,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        activo: form.activo,
      };

      if (!payload.nombre_completo) {
        setModalError("Nombre es obligatorio.");
        setIsSaving(false);
        return;
      }

      let res;
      if (form.id) {
        res = await fetch(`/api/admin/personas/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/personas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "No se pudo guardar.");
        setIsSaving(false);
        return;
      }

      const updated = data.persona as Persona;
      setItems((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === updated.id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = updated;
          return next.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
        }
        return [...prev, updated].sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
      });
      const message = form.id
        ? "Funcionario actualizado correctamente."
        : "Funcionario creado correctamente.";
      setSuccessToast({ message, visible: true });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setModalError("Error inesperado. Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActivo = async (persona: Persona) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/personas/${persona.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !persona.activo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar el estado.");
        return;
      }
      const updated = data.persona as Persona;
      setItems((prev) =>
        prev
          .map((p) => (p.id === persona.id ? updated : p))
          .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)),
      );
    } catch (err) {
      console.error(err);
      setError("Error inesperado al cambiar estado.");
    }
  };

  const handleDelete = async (persona: Persona) => {
    const confirmed = window.confirm(
      `¿Eliminar a ${persona.nombre_completo}? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/personas/${persona.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo eliminar.");
        return;
      }
      setItems((prev) => prev.filter((p) => p.id !== persona.id));
    } catch (err) {
      console.error(err);
      setError("Error inesperado al eliminar.");
    }
  };

  const renderEstado = (p: Persona) => {
    const base = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold";
    if (!p.activo) return <span className={`${base} bg-slate-200 text-slate-600`}>Inactivo</span>;
    if (!p.vigente) return <span className={`${base} bg-amber-100 text-amber-800`}>No vigente</span>;
    return <span className={`${base} bg-emerald-100 text-emerald-800`}>Activo</span>;
  };

  const renderTipo = (tipo: Persona["tipo"]) =>
    tipo.charAt(0).toUpperCase() + tipo.slice(1);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl cs-card px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Gestión de fila
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">Personas</h1>
            <p className="text-sm text-slate-600">
              Administra funcionarios, visitas y reemplazos con vigencia y estado.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              onClick={openCreate}
              className="h-10 w-full rounded-lg btn-accent sm:w-auto"
            >
              + Nueva Persona
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-[var(--error-border)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </div>
      ) : null}
      {successToast ? (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center px-4 pt-6">
          <div
            className={`w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-4 shadow-[var(--shadow-card)] transition-all duration-300 ${
              successToast.visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Operación exitosa</p>
                <p className="text-sm text-slate-600">{successToast.message}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Card className="cs-card">
        <CardHeader className="space-y-4">
          <CardTitle className="text-base font-semibold text-slate-900">
            Filtros
          </CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Buscar
              </p>
              <Input
                placeholder="Nombre o correo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 placeholder:text-[#a4abb8] shadow-[var(--shadow-xs)]"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Tipo
              </p>
              <Select
                value={tipoFilter}
                onValueChange={(v) => setTipoFilter((v as Persona["tipo"]) || "all")}
              >
                <SelectTrigger className="h-10 rounded-lg border-[#eeeff2] bg-white text-left text-slate-900 shadow-[var(--shadow-xs)]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {tipoOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {renderTipo(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Estado
              </p>
              <Select
                value={estadoFilter}
                onValueChange={(v) =>
                  setEstadoFilter((v as "all" | "activo" | "inactivo") || "all")
                }
              >
                <SelectTrigger className="h-10 rounded-lg border-[#eeeff2] bg-white text-left text-slate-900 shadow-[var(--shadow-xs)]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="inactivo">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Vigencia
              </p>
              <Select
                value={vigenciaFilter}
                onValueChange={(v) =>
                  setVigenciaFilter((v as "all" | "vigente" | "novigente") || "all")
                }
              >
                <SelectTrigger className="h-10 rounded-lg border-[#eeeff2] bg-white text-left text-slate-900 shadow-[var(--shadow-xs)]">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="vigente">Vigentes</SelectItem>
                  <SelectItem value="novigente">No vigentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-[#f1f2f5] text-sm">
              <thead className="bg-[#f8f9fb] text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Nombre</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Vigencia</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f2f5] bg-white text-slate-900">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No hay personas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-[#f8f9fb]">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.nombre_completo}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{p.email || "Sin correo"}</td>
                      <td className="px-4 py-3 text-slate-700">{renderTipo(p.tipo)}</td>
                      <td className="px-4 py-3 text-slate-700">{p.vigenciaLabel}</td>
                      <td className="px-4 py-3">{renderEstado(p)}</td>
                      <td className="px-4 py-3">{renderActionsMenu(p)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[#f1f2f5] md:hidden">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No hay personas con los filtros seleccionados.
              </div>
            ) : (
              filtered.map((p) => (
                <div key={p.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        {p.nombre_completo}
                      </div>
                      <div className="text-sm text-slate-600">{p.email || "Sin correo"}</div>
                    </div>
                    <div>{renderEstado(p)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      {renderTipo(p.tipo)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      {p.vigenciaLabel}
                    </span>
                  </div>
                  <div className="mt-3">{renderActionsMenu(p)}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar persona" : "Nueva persona"}</DialogTitle>
            <DialogDescription>
              Completa los datos de la persona. El email debe ser único.
            </DialogDescription>
          </DialogHeader>
          {modalError ? (
            <div className="rounded-lg border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{modalError}</span>
              </div>
            </div>
          ) : null}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                value={form.nombre_completo}
                onChange={(e) => setForm((f) => ({ ...f, nombre_completo: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="correo@ejemplo.cl (opcional)"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as Persona["tipo"] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {renderTipo(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Activo</Label>
                <Select
                  value={form.activo ? "1" : "0"}
                  onValueChange={(v) => setForm((f) => ({ ...f, activo: v === "1" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Activo</SelectItem>
                    <SelectItem value="0">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) => setForm((f) => ({ ...f, fecha_fin: e.target.value }))}
                />
              </div>
            </div>
            {form.fecha_inicio && form.fecha_fin && form.fecha_inicio > form.fecha_fin ? (
              <p className="text-xs text-[var(--error)]">
                La fecha inicio no puede ser mayor a la fecha fin.
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Guardar
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
