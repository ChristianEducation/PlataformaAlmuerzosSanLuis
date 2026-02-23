"use client";

import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST", cache: "no-store" });
    window.location.replace("/login");
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={cn(
        "rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100",
        className,
      )}
    >
      Salir
    </button>
  );
}
