/**
 * @fileoverview notifications.ts — Sistema de notificaciones dual.
 *
 * Implementa dos canales de notificación:
 * 1. **Email via Resend** — Intento principal. Requiere `RESEND_API_KEY` y un
 * dominio verificado en Resend.
 * 2. **WhatsApp fallback** — Si el email falla o el cliente no tiene email,
 * `buildWhatsAppUrl()` genera un enlace `wa.me/...` con el mensaje
 * pre-cargado para que Ana lo envíe manualmente en un clic.
 *
 * @module notifications
 */

import { Resend } from "resend";

/** Cliente de Resend. Se inicializa sin clave si la variable no está definida,
 * lo que permite que el módulo cargue sin errores aunque no se use el email. */
const resend = new Resend(process.env.RESEND_API_KEY || "");

/** URL base del sitio público (para enlaces de cancelación en emails). */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8081";

/** Dirección "from" de los correos. Debe coincidir con el dominio verificado en Resend. */
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "AG Beauty Salon <citas@anagonzalez.es>";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ConfirmationEmailParams {
  to: string;
  customerName: string;
  serviceName: string;
  startTime: string;
  cancelToken: string;
}

export interface CancellationEmailParams {
  to: string;
  customerName: string;
  serviceName: string;
  startTime: string;
}

export interface RescheduleEmailParams {
  to: string;
  customerName: string;
  serviceName: string;
  oldStartTime: string;
  newStartTime: string;
}

export interface WhatsAppParams {
  phone: string;
  customerName: string;
  serviceName: string;
  startTime: string;
}

// ─── Helpers de formato ──────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateES(iso: string): string {
  if (!iso) return "la fecha acordada";
  const d = new Date(iso);
  const fecha = d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hora = d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${fecha} a las ${hora}`;
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  if (cleaned.startsWith("34")) return cleaned;
  return `34${cleaned}`;
}

// ─── Email de confirmación ────────────────────────────────────────────────────

export async function sendConfirmationEmail(params: ConfirmationEmailParams): Promise<void> {
    const { to, customerName, serviceName, startTime, cancelToken } = params;
    const cancelUrl = `${SITE_URL}/cancelar/${cancelToken}`;
    const dateStr = formatDateES(startTime);
  
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Reserva confirmada — ${serviceName}`,
      html: `
      <!DOCTYPE html>
      <html lang="es">
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f7f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="min-width: 100%; background-color: #f9f7f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <tr>
                  <td align="center" style="padding: 40px 0 30px 0; border-bottom: 1px solid #f0ede9;">
                    <h1 style="font-family: 'Georgia', serif; font-size: 32px; color: #1a1a1a; letter-spacing: 6px; margin: 0;">AG</h1>
                    <p style="font-size: 10px; color: #9a8b7a; letter-spacing: 3px; text-transform: uppercase; margin: 10px 0 0 0;">Beauty Salon</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0;">Hola, <strong>${escapeHtml(customerName)}</strong></p>
                    <p style="font-size: 15px; color: #555555; line-height: 1.6; margin: 0 0 30px 0;">Tu reserva ha sido confirmada. Todo está listo para tu visita a nuestro salón.</p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcfbf9; border: 1px solid #f0ede9; border-radius: 4px; padding: 20px;">
                      <tr>
                        <td style="padding-bottom: 15px;">
                          <p style="font-size: 11px; color: #9a8b7a; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 5px 0;">Servicio</p>
                          <p style="font-size: 16px; color: #1a1a1a; font-weight: bold; margin: 0;">${escapeHtml(serviceName)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="font-size: 11px; color: #9a8b7a; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 5px 0;">Fecha y Hora</p>
                          <p style="font-size: 16px; color: #1a1a1a; margin: 0;">${dateStr}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <p style="font-size: 14px; color: #555555; line-height: 1.6; margin: 0 0 30px 0;">
                      📍 José María Salaberria 33, Donostia<br>
                      📞 843 67 35 95
                    </p>
                    <p style="font-size: 12px; color: #888888; text-align: center; margin: 0 0 15px 0;">¿Necesitas hacer un cambio?</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${cancelUrl}" style="display: inline-block; padding: 14px 30px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; border-radius: 2px;">Anular Cita</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="font-size: 11px; color: #aaaaaa; margin: 20px 0 0 0;">© 2026 AG Beauty Salon. Donostia-San Sebastián.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `,
    });

    if (error) {
       console.error("🔥 ERROR REAL DE RESEND AL CONFIRMAR:", error);
       throw new Error(`Fallo enviando email de confirmación: ${error.message}`);
    }
  }

// ─── Email de cancelación ────────────────────────────────────────────────────

export async function sendCancellationEmail(params: CancellationEmailParams): Promise<void> {
  const { to, customerName, serviceName, startTime } = params;
  const dateStr = formatDateES(startTime);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Cita cancelada — ${serviceName}`,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f7f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="min-width: 100%; background-color: #f9f7f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <tr>
                  <td align="center" style="padding: 40px 0 30px 0; border-bottom: 1px solid #f0ede9;">
                    <h1 style="font-family: 'Georgia', serif; font-size: 32px; color: #1a1a1a; letter-spacing: 6px; margin: 0;">AG</h1>
                    <p style="font-size: 10px; color: #9a8b7a; letter-spacing: 3px; text-transform: uppercase; margin: 10px 0 0 0;">Beauty Salon</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 40px 30px 40px; text-align: center;">
                    <p style="font-size: 16px; color: #333333; margin: 0 0 15px 0;">Hola, <strong>${escapeHtml(customerName)}</strong></p>
                    <p style="font-size: 15px; color: #555555; line-height: 1.6; margin: 0;">Confirmamos que tu cita para <strong>${escapeHtml(serviceName)}</strong> el <strong>${dateStr}</strong> ha sido cancelada correctamente.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <p style="font-size: 13px; color: #888888; text-align: center; margin: 0 0 20px 0;">Si deseas buscar otro hueco, puedes hacerlo desde nuestra web.</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <a href="${SITE_URL}/reservar" style="display: inline-block; padding: 14px 30px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; border-radius: 2px;">Reservar de nuevo</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="font-size: 11px; color: #aaaaaa; margin: 20px 0 0 0;">© 2026 AG Beauty Salon. Donostia-San Sebastián.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  if (error) {
     console.error("🔥 ERROR REAL DE RESEND AL CANCELAR:", error);
     throw new Error(`Fallo enviando email de cancelación: ${error.message}`);
  }
}

export async function sendRescheduleEmail(params: RescheduleEmailParams): Promise<void> {
  const { to, customerName, serviceName, oldStartTime, newStartTime } = params;
  const oldDateStr = formatDateES(oldStartTime);
  const newDateStr = formatDateES(newStartTime);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Cita modificada — ${serviceName}`,
    html: `
      <!DOCTYPE html>
      <html lang="es">
      <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f7f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="min-width: 100%; background-color: #f9f7f5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <tr>
                  <td align="center" style="padding: 40px 0 30px 0; border-bottom: 1px solid #f0ede9;">
                    <h1 style="font-family: 'Georgia', serif; font-size: 32px; color: #1a1a1a; letter-spacing: 6px; margin: 0;">AG</h1>
                    <p style="font-size: 10px; color: #9a8b7a; letter-spacing: 3px; text-transform: uppercase; margin: 10px 0 0 0;">Beauty Salon</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 40px 20px 40px;">
                    <p style="font-size: 16px; color: #333333; margin: 0 0 20px 0;">Hola, <strong>${escapeHtml(customerName)}</strong></p>
                    <p style="font-size: 15px; color: #555555; line-height: 1.6; margin: 0 0 25px 0;">Tu cita para <strong>${escapeHtml(serviceName)}</strong> ha sido actualizada. Estos son los nuevos datos:</p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcfbf9; border: 1px solid #f0ede9; border-radius: 4px; padding: 20px;">
                      <tr>
                        <td style="padding-bottom: 15px;">
                          <p style="font-size: 11px; color: #9a8b7a; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 5px 0;">Anterior</p>
                          <p style="font-size: 16px; color: #1a1a1a; font-weight: bold; margin: 0;">${oldDateStr}</p>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <p style="font-size: 11px; color: #9a8b7a; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 5px 0;">Nuevo horario</p>
                          <p style="font-size: 16px; color: #1a1a1a; font-weight: bold; margin: 0;">${newDateStr}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <p style="font-size: 13px; color: #888888; text-align: center; margin: 0;">Si el cambio no te encaja, responde a este correo o vuelve a reservar desde la web.</p>
                  </td>
                </tr>
              </table>
              <p style="font-size: 11px; color: #aaaaaa; margin: 20px 0 0 0;">© 2026 AG Beauty Salon. Donostia-San Sebastián.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error("🔥 ERROR REAL DE RESEND AL MODIFICAR:", error);
    throw new Error(`Fallo enviando email de modificación: ${error.message}`);
  }
}

// ─── WhatsApp fallback ───────────────────────────────────────────────────────

export function buildWhatsAppUrl(params: WhatsAppParams): string {
  const { phone, customerName, serviceName, startTime } = params;
  const dateStr = formatDateES(startTime);
  const normalizedPhone = normalizePhone(phone);

  const message = [
    `Hola ${customerName} 👋`,
    ``,
    `Te escribo desde AG Beauty Salon para informarte de que tu cita del ${dateStr} para *${serviceName}* ha sido cancelada.`,
    ``,
    `Disculpa las molestias. Si lo deseas, puedes reservar una nueva cita en ${SITE_URL}/reservar 💛`,
  ].join("\n");

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encoded}`;
}