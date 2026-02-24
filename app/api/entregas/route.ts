import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionFromCookies } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayInChileISO() {
  const fmt = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) return new Date().toISOString().slice(0, 10);
  return `${y}-${m}-${d}`;
}

function chileTimeMinutesNow() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Santiago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const hh = parts.find((p) => p.type === "hour")?.value || "00";
  const mm = parts.find((p) => p.type === "minute")?.value || "00";
  return parseInt(hh, 10) * 60 + parseInt(mm, 10);
}

function parseHHMMToMinutes(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (session.rol !== "casino" && session.rol !== "admin" && session.rol !== "superadmin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  // Validar ventana horaria desde configuracion (hora_inicio / hora_cierre)
  const supabase = createSupabaseServerClient();
  const { data: config } = await supabase
    .from("configuracion")
    .select("hora_inicio, hora_cierre, mensaje_cierre")
    .eq("id", 1)
    .maybeSingle();

  const nowMinutes = chileTimeMinutesNow();
  const startMinutes = parseHHMMToMinutes(config?.hora_inicio);
  const endMinutes = parseHHMMToMinutes(config?.hora_cierre);
  const fueraVentana =
    startMinutes !== null &&
    endMinutes !== null &&
    (nowMinutes < startMinutes || nowMinutes > endMinutes);
  if (fueraVentana) {
    return NextResponse.json(
      {
        error:
          config?.mensaje_cierre ||
          "Fuera de horario permitido para registrar entregas.",
      },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const personaId = Number(body?.personaId);
  const tipoMenu = body?.tipoMenu ? String(body.tipoMenu).trim() : null;
  if (!personaId || Number.isNaN(personaId)) {
    return NextResponse.json({ error: "personaId inválido." }, { status: 400 });
  }

  const today = todayInChileISO();

  const { data: persona, error: personaErr } = await supabase
    .from("personas")
    .select("id, nombre_completo, email, activo, fecha_inicio, fecha_fin")
    .eq("id", personaId)
    .maybeSingle();

  if (personaErr) {
    console.error("persona fetch error", personaErr);
    return NextResponse.json({ error: "Error al validar persona." }, { status: 500 });
  }
  if (!persona || !persona.activo) {
    return NextResponse.json({ error: "Persona no activa." }, { status: 400 });
  }
  if (persona.fecha_inicio && persona.fecha_inicio > today) {
    return NextResponse.json({ error: "Persona aún no vigente." }, { status: 400 });
  }
  if (persona.fecha_fin && persona.fecha_fin < today) {
    return NextResponse.json({ error: "Persona vencida." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("entregas")
    .insert({
      persona_id: personaId,
      fecha: today,
      tipo_menu: tipoMenu,
      creado_por_usuario_id: session.userId,
    })
    .select("id, created_at")
    .maybeSingle();

  if (error) {
    // 23505 unique violation (persona_id, fecha)
    const pgCode = (error as { code?: string } | null)?.code;
    if (pgCode === "23505") {
      return NextResponse.json({ error: "Ya se registró hoy." }, { status: 409 });
    }
    console.error("insert entrega error", error);
    return NextResponse.json({ error: "No se pudo registrar." }, { status: 500 });
  }

  const emailResult = await sendEntregaEmail({
    persona: { nombre_completo: persona.nombre_completo, email: persona.email },
    createdAt: data?.created_at ?? null,
    registradoPor: session.username,
  });

  return NextResponse.json({
    ok: true,
    entregaId: data?.id,
    createdAt: data?.created_at,
    persona: {
      id: persona.id,
      nombre: persona.nombre_completo,
      email: persona.email,
    },
    createdBy: session.username,
    emailSent: emailResult.sent,
    emailFallback: emailResult.fallback ?? false,
  });
}

async function sendEntregaEmail(params: {
  persona: { nombre_completo: string; email: string | null };
  createdAt: string | null;
  registradoPor: string;
}) {
  const { persona, createdAt, registradoPor } = params;
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!resendApiKey || !emailFrom) {
    console.warn("Email not sent: missing RESEND_API_KEY or EMAIL_FROM");
    return { sent: false, reason: "missing_config" as const };
  }

  // Durante pruebas con remitente no verificado, enviamos siempre a ADMIN_EMAIL
  const to = adminEmail || persona.email?.trim();
  if (!to) {
    console.warn("Email not sent: no destination (ADMIN_EMAIL empty)");
    return { sent: false, reason: "no_destination" as const };
  }

  const isFallback = true; // Forzamos envío solo al admin mientras se verifica dominio
  const dateStr = createdAt
    ? new Date(createdAt).toLocaleString("es-CL")
    : new Date().toLocaleString("es-CL");

  const subject = isFallback
    ? `Entrega sin correo – ${persona.nombre_completo}`
    : `Confirmación de almuerzo – Colegio San Luis`;

  const plainText = isFallback
    ? `Se entregó almuerzo a: ${persona.nombre_completo}
Fecha/hora: ${dateStr}
Registrado por: ${registradoPor}
Email de persona: (sin correo)

Contacto: Cristian Ly (Administrador)`
    : `Hola ${persona.nombre_completo},

Se registró la entrega de tu almuerzo el ${dateStr}.
Registrado por: ${registradoPor}.

Si no fuiste tú, contacta a administración.
Contacto: Cristian Ly (Administrador)`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#f6f7fb; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a; }
    .container { max-width:620px; margin:24px 0; padding:0 16px; }
    .card { background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden; box-shadow:0 18px 40px rgba(15,23,42,0.08); }
    .topbar { background:#f6d48c; padding:12px 20px; font-size:12px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#111827; }
    .content { padding:24px; }
    .header { display:block; }
    .title { font-size:22px; font-weight:700; margin:0 0 6px; }
    .subtitle { font-size:15px; color:#475569; margin:0; }
    .meta { margin-top:8px; font-size:12px; color:#64748b; }
    .section { margin-top:18px; border:1px solid #e5e7eb; border-radius:12px; padding:16px 18px; background:#f8fafc; }
    .row { margin:10px 0; }
    .label { font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; margin-bottom:4px; }
    .value { font-size:15px; font-weight:600; color:#0f172a; }
    .divider { height:1px; background:#e5e7eb; margin:18px 0; }
    .note { font-size:13px; color:#475569; margin:0; }
    .highlight { color:#0f172a; font-weight:700; }
    .footer { font-size:12px; color:#64748b; text-align:center; padding:18px 16px; background:#f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="topbar">Colegio San Luis · Plataforma de almuerzos</div>
      <div class="content">
        <div class="header">
          <div class="title">Confirmación de entrega</div>
          <div class="subtitle">Registro oficial de entrega de almuerzo</div>
          <div class="meta">Estado: Entregado</div>
        </div>

        <div class="section">
          <div class="row">
            <div class="label">Persona</div>
            <div class="value">${persona.nombre_completo}</div>
          </div>
          <div class="row">
            <div class="label">Fecha y hora (Chile)</div>
            <div class="value">${dateStr}</div>
          </div>
          <div class="row">
            <div class="label">Registrado por</div>
            <div class="value">${registradoPor}</div>
          </div>
          ${isFallback ? `<div class="row">
            <div class="label">Destino</div>
            <div class="value">Notificación al administrador (sin correo de persona)</div>
          </div>` : ""}
        </div>

        <div class="divider"></div>

        <p class="note">
          Si no fuiste tú, contacta a administración.
          <span class="highlight">Contacto: Cristian Ly (Administrador)</span>
        </p>
      </div>
      <div class="footer">
        Mensaje automático. Por favor no responder a este correo.
      </div>
    </div>
  </div>
</body>
</html>`;

  const resend = new Resend(resendApiKey);
  const result = await resend.emails.send({
    from: emailFrom,
    to,
    subject,
    text: plainText,
    html,
  });

  if (result.error) {
    console.error("Email send error", result.error);
    return { sent: false, reason: "send_error" as const };
  }

  return { sent: true, fallback: isFallback };
}
