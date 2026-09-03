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
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    unoptimized: true,
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
