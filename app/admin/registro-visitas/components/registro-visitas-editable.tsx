"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type SaveResult = { ok: boolean; value?: string | null; error?: string };

type Props = {
  value: string | null;
  disabled?: boolean;
  onSave: (next: string | null) => Promise<SaveResult>;
};

export function RegistroVisitasEditable({ value, disabled, onSave }: Props) {
  const [localValue, setLocalValue] = useState(value || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef(value || "");
  const [locked, setLocked] = useState(Boolean(value));

  const normalizeNombre = (input: string) => {
    const base = input.trim().replace(/\s+/g, " ");
    if (!base) return "";
    const withVisita = base.replace(/(^|\b)visita\s*(\d+)\b/gi, (match, prefix, num) =>
      `${prefix}Visita ${num}`.trimStart(),
    );
    const normalized = withVisita.replace(/\s+/g, " ").trim();
    return normalized
      .split(" ")
      .map((word) =>
        /^\d+$/.test(word) ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join(" ");
  };

  useEffect(() => {
    setLocalValue(value || "");
    lastSavedRef.current = value || "";
    setLocked(Boolean(value));
  }, [value]);

  const commit = async () => {
    if (disabled || isSaving || locked) return;
    const next = normalizeNombre(localValue);
    if (next === lastSavedRef.current) return;

    setIsSaving(true);
    setError(null);
    const result = await onSave(next ? next : null);
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error || "No se pudo guardar.");
      return;
    }

    lastSavedRef.current = result.value ?? "";
    setLocalValue(result.value || "");
    setLocked(true);
  };

  if (disabled || locked) {
    return <span className="text-sm text-slate-700">{value || "—"}</span>;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder="Ingresar nombre oficial"
          className="h-9 rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
        />
        <button
          type="button"
          onClick={commit}
          disabled={isSaving || !localValue.trim()}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-[#eeeff2] px-3 text-xs font-semibold text-slate-700 shadow-[var(--shadow-xs)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : "Confirmar"}
        </button>
      </div>
      {error ? <p className="text-xs text-[var(--error)]">{error}</p> : null}
    </div>
  );
}
