"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

type ConfigRow = {
  hora_inicio: string | null;
  hora_cierre: string | null;
  mensaje_cierre: string | null;
  reporte_email: string | null;
  precio_almuerzo: number | null;
};

type Props = {
  initialConfig: ConfigRow;
};

export function ConfiguracionClient({ initialConfig }: Props) {
  const [horaInicio, setHoraInicio] = useState(initialConfig.hora_inicio || "");
  const [horaCierre, setHoraCierre] = useState(initialConfig.hora_cierre || "");
  const [mensajeCierre, setMensajeCierre] = useState(initialConfig.mensaje_cierre || "");
  const [reporteEmail, setReporteEmail] = useState(initialConfig.reporte_email || "");
  const [precioAlmuerzo, setPrecioAlmuerzo] = useState(
    initialConfig.precio_almuerzo?.toString() || "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/configuracion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hora_inicio: horaInicio || null,
          hora_cierre: horaCierre || null,
          mensaje_cierre: mensajeCierre || null,
          reporte_email: reporteEmail || null,
          precio_almuerzo: precioAlmuerzo.trim() !== "" ? Number(precioAlmuerzo) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar.");
        setIsSaving(false);
        return;
      }
      setSuccess("Configuración guardada.");
    } catch (err) {
      console.error(err);
      setError("Error inesperado. Intenta nuevamente.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          Configuración
        </p>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Ajustes Básicos</h1>
          <p className="text-sm text-slate-600">
            Define el cierre diario y el mensaje que se mostrará al cerrar.
          </p>
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
      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{success}</span>
          </div>
        </div>
      ) : null}

      <Card className="cs-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-slate-900">
            Cierre diario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="hora-inicio">Hora de inicio (HH:MM)</Label>
              <Input
                id="hora-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
              />
              <p className="text-xs text-slate-500">
                Desde esta hora se permiten nuevas entregas.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora-cierre">Hora de cierre (HH:MM)</Label>
              <Input
                id="hora-cierre"
                type="time"
                value={horaCierre}
                onChange={(e) => setHoraCierre(e.target.value)}
                className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
              />
              <p className="text-xs text-slate-500">
                Después de esta hora puedes bloquear nuevas entregas o usarla para reportes diarios.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reporte-email">Correo para reporte diario (opcional)</Label>
              <Input
                id="reporte-email"
                type="email"
                value={reporteEmail}
                onChange={(e) => setReporteEmail(e.target.value)}
                placeholder="admin@colegio.cl"
                className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
              />
              <p className="text-xs text-slate-500">
                Úsalo si luego quieres enviar un resumen diario a un correo específico.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="precio-almuerzo">Precio almuerzo (CLP)</Label>
              <Input
                id="precio-almuerzo"
                type="number"
                min="0"
                step="1"
                value={precioAlmuerzo}
                onChange={(e) => setPrecioAlmuerzo(e.target.value)}
                placeholder="4275"
                className="h-10 rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
              />
              <p className="text-xs text-slate-500">
                Se usa para proyecciones y métricas mensuales.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mensaje-cierre">Mensaje de cierre</Label>
            <Textarea
              id="mensaje-cierre"
              value={mensajeCierre}
              onChange={(e) => setMensajeCierre(e.target.value)}
              placeholder="Ej: Cierre diario a las 15:00. Para excepciones, contactar a administración."
              className="min-h-[100px] rounded-lg border-[#eeeff2] bg-white text-slate-900 shadow-[var(--shadow-xs)]"
            />
            <p className="text-xs text-slate-500">
              Se puede mostrar en la pantalla de fila o en avisos al alcanzar la hora de cierre.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-10 w-full rounded-lg btn-accent sm:w-auto"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </span>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
