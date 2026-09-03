/**
 * Herbs Store stylesheet loader — the `/herbs/**`-only equivalent of
 * `@/components/layout/PublicStylesheets`. Same `precedence` mechanism
 * (see that component's header for why it's required for correct <head>
 * placement) applied to the Herbs Store's own scoped stylesheet instead
 * of the legacy theme CSS.
 */
export function HerbsStylesheets() {
  return <link rel="stylesheet" href="/herbs-assets/herbs-theme.css" precedence="high" />;
}
