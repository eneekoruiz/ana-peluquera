/**
 * @fileoverview notifications.ts — Sistema de notificaciones dual (Email + WhatsApp).
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://eneko-ruiz.vercel.app";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "AG Beauty Salon <citas@anagonzalez.es>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ana@tudominio.com";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ConfirmationEmailParams {
  to: string;
  customerName: string;
  serviceName: string;
  startTime: string;
  cancelToken: string;
  lang?: string;
}

export interface CancellationEmailParams {
  to: string;
  customerName: string;
  serviceName: string;
  startTime: string;
  lang?: string;
}

export interface AdminAlertParams {
  clientName: string;
  date: string;
  time: string;
  error: string;
}

export interface WhatsAppParams {
  phone: string;
  customerName: string;
  serviceName: string;
  startTime: string;
  lang?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateES(iso: string, lang = 'es'): string {
  if (!iso) return "";
  const d = new Date(iso);
  const locale = lang === 'eu' ? 'eu-ES' : lang === 'en' ? 'en-US' : 'es-ES';
  
  const fecha = d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hora = d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fecha} - ${hora}`;
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("34")) return cleaned;
  return `34${cleaned}`;
}

// ─── Email de Confirmación ────────────────────────────────────────────────────

export async function sendConfirmationEmail(params: ConfirmationEmailParams): Promise<void> {
  const { to, customerName, serviceName, startTime, cancelToken, lang = 'es' } = params;
  const cancelUrl = `${SITE_URL}/cancelar/${cancelToken}`;
  const dateStr = formatDateES(startTime, lang);

  const t = {
    es: { subject: `Reserva confirmada — ${serviceName}`, subtitle: "RESERVA CONFIRMADA", hello: "Hola", text: "Tu reserva ha sido confirmada. Todo está listo para tu visita.", srv: "SERVICIO", dat: "FECHA Y HORA", btn: "Anular Cita" },
    en: { subject: `Booking confirmed — ${serviceName}`, subtitle: "BOOKING CONFIRMED", hello: "Hello", text: "Your booking has been confirmed. Everything is ready for your visit.", srv: "SERVICE", dat: "DATE & TIME", btn: "Cancel Booking" },
    eu: { subject: `Hitzordua baieztatuta — ${serviceName}`, subtitle: "HITZORDUA BAIEZTATUTA", hello: "Kaixo", text: "Zure hitzordua baieztatuta dago. Dena prest dago zure bisitarako.", srv: "ZERBITZUA", dat: "DATA ETA ORDUA", btn: "Hitzordua Utzi" }
  };
  const txt = t[lang as keyof typeof t] || t.es;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: txt.subject,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; background: #fff; border: 1px solid #eee;">
        <h1 style="text-align: center; color: #1a1a1a; letter-spacing: 4px;">AG</h1>
        <p style="text-align: center; color: #9a8b7a; font-size: 10px; text-transform: uppercase;">Beauty Salon</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p><strong>${txt.hello} ${escapeHtml(customerName)}</strong>,</p>
        <p>${txt.text}</p>
        <div style="background: #fcfbf9; padding: 15px; border: 1px solid #f0ede9;">
          <p><strong>${txt.srv}:</strong> ${escapeHtml(serviceName)}</p>
          <p><strong>${txt.dat}:</strong> ${dateStr}</p>
        </div>
        <p style="text-align: center; margin-top: 30px;">
          <a href="${cancelUrl}" style="background: #1a1a1a; color: #fff; padding: 12px 25px; text-decoration: none; font-size: 12px; border-radius: 2px;">${txt.btn}</a>
        </p>
      </div>
    `
  });
}

// ─── Email de Cancelación ─────────────────────────────────────────────────────

export async function sendCancellationEmail(params: CancellationEmailParams): Promise<void> {
  const { to, customerName, serviceName, startTime, lang = 'es' } = params;
  const dateStr = formatDateES(startTime, lang);

  const t = {
    es: { subject: `Cita cancelada — ${serviceName}`, hello: "Hola", text: `Tu cita para ${serviceName} el ${dateStr} ha sido cancelada.` },
    en: { subject: `Booking cancelled — ${serviceName}`, hello: "Hello", text: `Your booking for ${serviceName} on ${dateStr} has been cancelled.` },
    eu: { subject: `Hitzordua utzita — ${serviceName}`, hello: "Kaixo", text: `Zure ${serviceName}rako hitzordua (${dateStr}) utzi da.` }
  };
  const txt = t[lang as keyof typeof t] || t.es;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: txt.subject,
    html: `<p>${txt.hello} ${escapeHtml(customerName)},</p><p>${txt.text}</p>`
  });
}

// ─── Email de Modificación ────────────────────────────────────────────────────

export async function sendRescheduleEmail(params: { to: string; customerName: string; serviceName: string; oldStartTime: string; newStartTime: string; lang?: string }): Promise<void> {
  const { to, customerName, serviceName, oldStartTime, newStartTime, lang = 'es' } = params;
  const oldDateStr = formatDateES(oldStartTime, lang);
  const newDateStr = formatDateES(newStartTime, lang);

  const t = {
    es: { subject: `Cita modificada — ${serviceName}`, hello: "Hola", text: `Tu cita para ${serviceName} ha sido actualizada.` },
    en: { subject: `Booking modified — ${serviceName}`, hello: "Hello", text: `Your booking for ${serviceName} has been updated.` },
    eu: { subject: `Hitzordua aldatuta — ${serviceName}`, hello: "Kaixo", text: `Zure ${serviceName}rako hitzordua aldatu da.` }
  };
  const txt = t[lang as keyof typeof t] || t.es;

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: txt.subject,
    html: `<p><strong>${txt.hello} ${escapeHtml(customerName)}</strong>,</p><p>${txt.text}</p><p>Anterior: ${oldDateStr}<br>Nuevo: ${newDateStr}</p>`
  });
}

// ─── Alerta Urgente para Ana (Admin) ──────────────────────────────────────────

export async function sendAdminAlert(params: AdminAlertParams): Promise<void> {
  const { clientName, date, time, error } = params;

  await resend.emails.send({
    from: "AG Beauty Alertas <onboarding@resend.dev>",
    to: ADMIN_EMAIL,
    subject: "⚠️ ALERTA: Fallo en Sincronización - AG Beauty Salon",
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #dc2626;">⚠️ Google Calendar Desconectado</h2>
        <p>Hola Ana,</p>
        <p>Un cliente (<strong>${escapeHtml(clientName)}</strong>) ha intentado reservar el <strong>${date} a las ${time}</strong>.</p>
        <p style="color: #dc2626; font-weight: bold;">La reserva NO se ha guardado en el calendario porque la conexión con Google ha fallado.</p>
        <p><strong>Error técnico:</strong> ${error}</p>
        <p>Por favor, revisa el panel de administración para reconectar Google.</p>
      </div>
    `
  });
}

// ─── WhatsApp fallback ───────────────────────────────────────────────────────

export function buildWhatsAppUrl(params: WhatsAppParams): string {
  const { phone, customerName, serviceName, startTime, lang = 'es' } = params;
  const dateStr = formatDateES(startTime, lang);
  const normalizedPhone = normalizePhone(phone);

  const t = {
    es: `Hola ${customerName} 👋. Te informamos que tu cita del ${dateStr} para *${serviceName}* ha sido cancelada. Disculpa las molestias.`,
    en: `Hello ${customerName} 👋. We inform you that your appointment on ${dateStr} for *${serviceName}* has been cancelled. We apologize for the inconvenience.`,
    eu: `Kaixo ${customerName} 👋. Jakinarazten dizugu ${dateStr}ko zure hitzordua (*${serviceName}*) utzi egin dela. Barkatu eragozpenak.`
  };
  const message = t[lang as keyof typeof t] || t.es;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}