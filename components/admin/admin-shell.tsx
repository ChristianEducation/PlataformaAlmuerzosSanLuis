"use client";

import { ReactNode, useState } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { LogoutButton } from "@/components/logout-button";
import { Menu, X } from "lucide-react";

type Props = {
  children: ReactNode;
};

export function AdminShell({ children }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <div className="hidden lg:block self-start sticky top-6">
          <AdminSidebar />
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-black/[0.02] lg:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
                onClick={() => setOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="h-4 w-4" />
              </button>
              <p className="text-base font-semibold text-slate-900">Panel de administración</p>
            </div>
            <LogoutButton />
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Navegación</p>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AdminSidebar
              className="w-full border-0 bg-transparent p-0 shadow-none ring-0"
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
