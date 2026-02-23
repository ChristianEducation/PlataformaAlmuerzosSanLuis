import { ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";
import { getSessionFromCookies } from "@/lib/auth/session";

export const runtime = "nodejs";

export default async function AdminMetricasLayout({ children }: { children: ReactNode }) {
  const session = await getSessionFromCookies();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm ring-1 ring-black/[0.02] sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Colegio San Luis
            </p>
            <p className="text-base font-semibold text-slate-900">
              Panel de Administración Casino
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {session?.rol === "superadmin" ? (
              <a
                href="/admin"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 shadow-[var(--shadow-xs)] transition hover:bg-slate-100"
              >
                Volver a Superadmin
              </a>
            ) : null}
            <a
              href="/fila"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 shadow-[var(--shadow-xs)] transition hover:bg-slate-100"
            >
              Ir a Fila
            </a>
            <LogoutButton />
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
