/**
 * Resend (email delivery) configuration for the admin "forgot password"
 * flow — genuinely new, no Laravel equivalent, kept OUT of
 * `src/lib/env.ts` deliberately: that file is a governed registry of
 * Laravel-fidelity configuration (every default traces to a documented
 * Laravel source; see its own header). Resend has no such source — this
 * is net-new admin-only infrastructure, same "own small config module"
 * precedent the herbs/pages/redirects/audit trees already established
 * for other no-Laravel-equivalent features.
 */

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `The admin "forgot password" flow needs a Resend API key and a ` +
        `verified sender address to send reset emails — see README/setup ` +
        `notes for how to obtain one (resend.com has a free tier).`
    );
  }
  return value;
}

export interface ResendConfig {
  apiKey: string;
  fromAddress: string;
}

/** Throws if `RESEND_API_KEY`/`RESEND_FROM_ADDRESS` are unset — callers
 * that need to degrade gracefully (e.g. show a clear error instead of a
 * crash) should catch this, not check env vars themselves. */
export function getResendConfig(): ResendConfig {
  return {
    apiKey: required('RESEND_API_KEY'),
    fromAddress: required('RESEND_FROM_ADDRESS'),
  };
}
