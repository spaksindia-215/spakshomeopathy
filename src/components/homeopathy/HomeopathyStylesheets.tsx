/**
 * Loads the Homeopathy Store's own scoped stylesheet. Mirrors
 * `HerbsStylesheets.tsx`'s pattern exactly (a single `<link>` with
 * `precedence="high"` so React can dedupe/order it correctly) — separate
 * stylesheet, separate route family, no interference with the legacy
 * site CSS or the Herbs Store's own `herbs-theme.css`.
 */
export function HomeopathyStylesheets() {
  return <link rel="stylesheet" href="/homeopathy-assets/homeopathy-theme.css" precedence="high" />;
}
