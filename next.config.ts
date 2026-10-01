import type { NextConfig } from 'next';

/**
 * Next.js configuration.
 *
 * MIGRATION CONTRACT NOTES
 * ------------------------
 * Settings here are deliberately conservative. Each corresponds to a
 * constraint in MIGRATION-CONTRACT.md and must not be "optimized" without
 * a Change Request (Part 6).
 *
 * - Image optimization is DISABLED.
 *   Contract F-29 forbids image handling changes (resizing, WebP conversion,
 *   lazy loading) and forbids markup changes. Next.js image optimization
 *   would alter both. The Laravel app serves plain <img> tags pointing at
 *   /uploaded_files/... and /assets/...; that must remain byte-identical.
 *   This also removes the request-path relevance of the `sharp` advisory
 *   noted in the Milestone 0 Gate Report.
 *
 * - `/public/*` rewrites are NOT yet added.
 *   Blueprint R-28 / contract §5.3 require that `/public/x` resolve
 *   identically to `/x`, because Blade templates hardcode absolute URLs
 *   containing `/public/` (e.g. the catalogue PDF) and those URLs are
 *   indexed. This is Milestone 12 scope (blueprint §22 M12). Adding it now
 *   would be implementing application behavior, which Milestone 0 forbids.
 *
 * - `poweredByHeader` is disabled: it is a Next.js-injected response header
 *   with no Laravel equivalent. Contract §7.3 excludes platform headers from
 *   the 1:1 definition, so removing it is safe and reduces baseline noise.
 *
 * - `experimental.trustHostHeader: true` — INFRASTRUCTURE/DEPLOYMENT FIX,
 *   NOT AN APPLICATION-BEHAVIOR CHANGE. Confirmed via direct SSH
 *   investigation of the live Hostinger deployment (2026-09-19): Next.js's
 *   standalone server only auto-enables this when it detects it is
 *   running on Vercel (`hasNextSupport`, `next/dist/server/config.js`).
 *   On every other host — including this Hostinger/Passenger deployment —
 *   it defaults to `false`, which means `request.nextUrl.origin`
 *   (used throughout this app's ~56 redirect call sites, e.g.
 *   `admin/user-login/route.ts`) ignores the reverse proxy's real
 *   forwarded host and falls back to the Node process's own bind address
 *   (`0.0.0.0:3000`, per the Hostinger-generated `server.js`'s own
 *   `hostname = process.env.HOSTNAME || '0.0.0.0'` default). This broke
 *   EVERY POST-redirect in the deployed app (login, cart, checkout, every
 *   admin save/update action) — confirmed live: logging in at
 *   `spakshomeopathy.elitesfly.com/admin/login` redirected to
 *   `https://0.0.0.0:3000/admin/home` instead of staying on the real
 *   domain. This flag does not change any URL, route, or business logic —
 *   it only makes Next.js trust the SAME `Host`/`X-Forwarded-Host` header
 *   Passenger already forwards correctly, which is the standard,
 *   documented mechanism for exactly this deployment shape.
 *
 *   NOT YET IN THIS NEXT.JS VERSION'S PUBLIC TYPES (15.5.22): `next`'s own
 *   `ExperimentalConfig` type doesn't list `trustHostHeader`, even though
 *   the runtime (`next/dist/server/config.js`) reads and honors it —
 *   confirmed directly against the installed package. A narrow, local
 *   cast is used below rather than loosening this file's overall typing.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  experimental: {
    trustHostHeader: true,
  } as NextConfig['experimental'],

  images: {
    unoptimized: true,
  },

  // DEPLOYMENT FIX (Vercel), not an application-behavior change: the
  // upload helpers resolve `process.cwd()/public/...`, which made file
  // tracing copy all of /public (~600 MB) into every admin function,
  // exceeding Vercel's 250 MB function limit and the Hobby plan's
  // 12-function cap. /public is served statically by the host, so no
  // route needs it bundled.
  outputFileTracingExcludes: {
    '*': ['public/**/*'],
  },

  typescript: {
    // Never suppress type errors. Build must fail on type errors.
    ignoreBuildErrors: false,
  },

  eslint: {
    // Never suppress lint errors during builds.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
