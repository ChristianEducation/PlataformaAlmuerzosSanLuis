"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/metricas", label: "Métricas" },
  { href: "/admin/entregas", label: "Historial de Entregas" },
  { href: "/admin/registro-visitas", label: "Registro de Visitas" },
  { href: "/admin/personas", label: "Gestión de Personas" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/configuracion", label: "Configuración" },
];

type AdminSidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function AdminSidebar({ className, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex w-56 shrink-0 flex-col rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm ring-1 ring-black/[0.02]",
        className,
      )}
    >
      <div className="mb-5 space-y-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Colegio San Luis
          </p>
          <p className="text-base font-semibold text-slate-900">Administración</p>
        </div>
        <div className="inline-flex w-max rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          SuperAdmin
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname?.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "block rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--accent-soft)] text-slate-900 shadow-[var(--shadow-xs)]"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Cambiar vista
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <Link
              href="/admin-metricas"
              onClick={onNavigate}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 shadow-[var(--shadow-xs)] transition hover:bg-slate-100"
            >
              Vista Admin
            </Link>
            <Link
              href="/fila"
              onClick={onNavigate}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 shadow-[var(--shadow-xs)] transition hover:bg-slate-100"
            >
              Vista Fila
            </Link>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <LogoutButton />
      </div>
    </aside>
  );
}
