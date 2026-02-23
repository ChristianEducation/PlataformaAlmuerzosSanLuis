"use client";

import { useMemo, useState } from "react";
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
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type Usuario = {
  id: number;
  username: string;
  rol: "casino" | "admin" | "superadmin";
  activo: boolean;
  created_at: string;
  last_login_at: string | null;
  createdLabel: string;
  lastLoginLabel: string;
};

type Props = {
  usuarios: Usuario[];
};

type FormState = {
  id?: number;
  username: string;
  rol: "casino" | "admin" | "superadmin";
  activo: boolean;
  password: string;
};

export function UsuariosClient({ usuarios }: Props) {
  const [items, setItems] = useState<Usuario[]>(usuarios);
  const [search, setSearch] = useState("");
  const [rolFilter, setRolFilter] = useState<"all" | "casino" | "admin" | "superadmin">(
    "all",
  );
  const [estadoFilter, setEstadoFilter] = useState<"all" | "activo" | "inactivo">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    username: "",
    rol: "casino",
    activo: true,
    password: "",
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((u) => {
      if (rolFilter !== "all" && u.rol !== rolFilter) return false;
      if (estadoFilter === "activo" && !u.activo) return false;
      if (estadoFilter === "inactivo" && u.activo) return false;
      if (!term) return true;
      return u.username.toLowerCase().includes(term);
    });
  }, [items, search, rolFilter, estadoFilter]);

  const openCreate = () => {
    setForm({
      id: undefined,
      username: "",
      rol: "casino",
      activo: true,
      password: "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (u: Usuario) => {
    setForm({
      id: u.id,
      username: u.username,
      rol: u.rol,
      activo: u.activo,
      password: "",
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        username: form.username.trim(),
        rol: form.rol,
        activo: form.activo,
        password: form.password.trim(),
      };
      if (!payload.username) {
        setError("El username es obligatorio.");
        setIsSaving(false);
        return;
      }
      if (!form.id && !payload.password) {
        setError("Debes definir una contraseña.");
        setIsSaving(false);
        return;
      }

      let res;
      if (form.id) {
        const body: Record<string, unknown> = { rol: payload.rol, activo: payload.activo };
        if (payload.password) body.password = payload.password;
        res = await fetch(`/api/admin/usuarios/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/admin/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        setIsSaving(false);
        return;
      }

      const updated = data.usuario as Usuario;
      setItems((prev) => {
        const idx = prev.findIndex((u) => u.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next.sort((a, b) => a.username.localeCompare(b.username));
        }
        return [...prev, updated].sort((a, b) => a.username.localeCompare(b.username));
      });
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setError("Error inesperado. Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActivo = async (u: Usuario) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !u.activo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar el estado.");
        return;
      }
      const updated = data.usuario as Usuario;
      setItems((prev) =>
        prev
          .map((item) => (item.id === u.id ? updated : item))
          .sort((a, b) => a.username.localeCompare(b.username)),
      );
    } catch (err) {
      console.error(err);
      setError("Error inesperado al cambiar estado.");
    }
  };

  const renderEstado = (u: Usuario) => {
    const base = "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold";
    if (!u.activo) return <span className={`${base} bg-slate-200 text-slate-600`}>Inactivo</span>;
    return <span className={`${base} bg-emerald-100 text-emerald-800`}>Activo</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          Usuarios
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Gestión de usuarios</h1>
            <p className="text-sm text-slate-600">Crea, edita, activa o resetea contraseñas.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              onClick={openCreate}
              className="h-10 w-full rounded-lg bg-[#ffd85f] text-black shadow-[var(--shadow-xs)] hover:bg-[#f2c94c] sm:w-auto"
            >
              Nuevo usuario
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

      <Card className="border-[#eeeff2] shadow-[var(--shadow-card)]">
        <CardHeader className="space-y-4">
          <CardTitle className="text-base font-semibold text-slate-900">
            Filtros
          </CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Buscar
              </p>
              <Input
                placeholder="Username"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 placeholder:text-[#a4abb8] shadow-[var(--shadow-xs)]"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                Rol
              </p>
              <Select
                value={rolFilter}
                onValueChange={(v) =>
                  setRolFilter((v as "all" | "casino" | "admin" | "superadmin") || "all")
                }
              >
                <SelectTrigger className="h-10 rounded-lg border-[#eeeff2] bg-white text-left text-slate-900 shadow-[var(--shadow-xs)]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="casino">Casino</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
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
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-[#f1f2f5] text-sm">
              <thead className="bg-[#f8f9fb] text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Username</th>
                  <th className="px-4 py-3 text-left font-semibold">Rol</th>
                  <th className="px-4 py-3 text-left font-semibold">Estado</th>
                  <th className="px-4 py-3 text-left font-semibold">Último acceso</th>
                  <th className="px-4 py-3 text-left font-semibold">Creado</th>
                  <th className="px-4 py-3 text-left font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f2f5] bg-white text-slate-900">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                      No hay usuarios con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="hover:bg-[#f8f9fb]">
                      <td className="px-4 py-3 font-medium">{u.username}</td>
                      <td className="px-4 py-3 text-slate-700">{u.rol}</td>
                      <td className="px-4 py-3">{renderEstado(u)}</td>
                      <td className="px-4 py-3 text-slate-700">{u.lastLoginLabel}</td>
                      <td className="px-4 py-3 text-slate-700">{u.createdLabel}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(u)}
                            className="h-8 border-[#eeeff2]"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActivo(u)}
                            className="h-8 border-[#eeeff2]"
                          >
                            {u.activo ? "Desactivar" : "Activar"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-[#f1f2f5] md:hidden">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">
                No hay usuarios con los filtros seleccionados.
              </div>
            ) : (
              filtered.map((u) => (
                <div key={u.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">{u.username}</div>
                      <div className="text-sm text-slate-600">{u.rol}</div>
                    </div>
                    <div>{renderEstado(u)}</div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-slate-500">
                    <div>Último acceso: {u.lastLoginLabel}</div>
                    <div>Creado: {u.createdLabel}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(u)}
                      className="h-8 border-[#eeeff2]"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActivo(u)}
                      className="h-8 border-[#eeeff2]"
                    >
                      {u.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
            <DialogDescription>
              El username debe ser único. Si cambias contraseña, se actualizará el hash.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Username</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                disabled={!!form.id}
                placeholder="usuario.ejemplo"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Rol</Label>
                <Select
                  value={form.rol}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      rol: (v as "casino" | "admin" | "superadmin") || "casino",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casino">Casino</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Superadmin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
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
            <div className="space-y-1">
              <Label>{form.id ? "Nueva contraseña (opcional)" : "Contraseña"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={form.id ? "Dejar en blanco para no cambiar" : "••••••••"}
              />
            </div>
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
