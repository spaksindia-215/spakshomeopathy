/**
 * Sends the admin password-reset email via Resend.
 *
 * Kept as its own small module (not inlined into the route handler that
 * calls it) so the route handler's own logic (token generation, DB
 * write, redirect) stays readable, and so this is the one place a
 * future change of email provider would touch.
 */

import { Resend } from 'resend';
import { getResendConfig } from './resendConfig';

export interface SendResult {
  sent: boolean;
  reason?: string;
}

/** Sends the reset link to `toEmail`. Never throws — a delivery failure
 * (bad API key, provider outage, invalid recipient) returns
 * `{ sent: false, reason }` instead, so the calling route can show an
 * honest message rather than a raw 500. Mirrors this codebase's
 * established "degrade gracefully, disclose why" posture for external
 * dependencies (e.g. `src/lib/herbs/db/service.ts`'s own DB-write
 * results). */
export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<SendResult> {
  let config;
  try {
    config = getResendConfig();
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : 'Email is not configured.' };
  }

  try {
    const resend = new Resend(config.apiKey);
    const { error } = await resend.emails.send({
      from: config.fromAddress,
      to: toEmail,
      subject: 'Reset your Spaks Homeopathy admin password',
      html: `
        <p>A password reset was requested for your Spaks Homeopathy admin account.</p>
        <p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    if (error) {
      return { sent: false, reason: error.message };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : 'Unknown error sending email.',
    };
  }
}
