"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";

type FormState = { error?: string };

export function LoginForm() {
  const [formState, setFormState] = useState<FormState>({});
  const [isPending, startTransition] = useTransition();
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formState?.error) {
      usernameRef.current?.focus();
    }
  }, [formState?.error]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");

    startTransition(async () => {
      setFormState({});
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const json = await res.json();
        if (!res.ok) {
          setFormState({ error: json.error || "No se pudo validar." });
          return;
        }
        window.location.href = json.redirectTo || "/fila";
      } catch (err) {
        console.error(err);
        setFormState({ error: "Error inesperado. Intenta nuevamente." });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm font-medium text-slate-700">
          Usuario
        </Label>
        <Input
          id="username"
          name="username"
          ref={usernameRef}
          placeholder="ej: usuario.casino"
          autoComplete="username"
          required
          className="h-11 rounded-lg border-[#eeeff2] bg-white text-slate-900 placeholder:text-[#a4abb8] shadow-[var(--shadow-xs)]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-slate-700">
          Contraseña
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          className="h-11 rounded-lg border-[#eeeff2] bg-white text-slate-900 placeholder:text-[#a4abb8] shadow-[var(--shadow-xs)]"
        />
        <p className="text-xs text-slate-500">Si olvidaste tu contraseña, contacta al administrador.</p>
      </div>
      {formState?.error ? (
        <div className="flex items-start gap-2 rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formState.error}</span>
        </div>
      ) : null}
      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full rounded-lg bg-[#ffe3a3] text-slate-900 shadow-[var(--shadow-xs)] hover:bg-[#f6d48c]"
      >
        {isPending ? "Validando..." : "Ingresar"}
      </Button>
      <p className="text-sm text-slate-600">
        ¿Problemas para ingresar? Contacta al administrador.
      </p>
    </form>
  );
}
