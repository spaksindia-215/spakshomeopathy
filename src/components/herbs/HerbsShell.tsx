import type { ReactNode } from 'react';
import { HerbsStylesheets } from './HerbsStylesheets';
import { HerbsStoreProvider } from './HerbsStoreProvider';
import { HerbsHeader } from './HerbsHeader';
import { HerbsFooter } from './HerbsFooter';
import { QuickViewModal } from './QuickViewModal';
import type { HerbProduct } from '@/lib/herbs/types';

export interface HerbsShellProps {
  children: ReactNode;
  /** Optional DB-merged catalogue from `getMergedHerbCatalog()`
   * (`@/lib/herbs/catalog`, server-only), fetched once by the calling
   * page and forwarded here so the header's quick-search sees the same
   * merged data as the page body — rather than each independently
   * defaulting to the static seed catalogue. Omit to keep the previous,
   * seed-only behavior (still correct, just without DB-saved products). */
  catalog?: HerbProduct[];
}

/**
 * Shared page shell for every `/herbs/**` route: stylesheet, client-state
 * provider, header, footer, and the Quick View modal. Mirrors the
 * repeated `<PublicStylesheets/><PublicHeader/>…<PublicFooter/>` pattern
 * every legacy public page already uses (see `src/app/products/page.tsx`)
 * so Herbs pages follow the same shape, just factored into one wrapper
 * since every Herbs page needs the exact same five pieces (no legacy page
 * needed a shared wrapper because their assembly differs subtly per page
 * — Herbs pages' assembly does not).
 */
export function HerbsShell({ children, catalog }: HerbsShellProps) {
  return (
    <HerbsStoreProvider>
      {/* `.herbs-scope` wraps the ENTIRE shell (not just header/footer
          individually) — every `.herbs-scope .foo` rule in
          herbs-theme.css requires this ancestor on every Herbs element,
          including page body content passed as `children`. */}
      <div className="herbs-page-wrapper herbs-scope">
        <HerbsStylesheets />
        <HerbsHeader catalog={catalog} />
        {children}
        <HerbsFooter />
        <QuickViewModal />
      </div>
    </HerbsStoreProvider>
  );
}
