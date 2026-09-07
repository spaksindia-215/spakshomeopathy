import type { ReactNode } from 'react';
import { HomeopathyStylesheets } from './HomeopathyStylesheets';
import { HomeopathyHeader } from './HomeopathyHeader';
import { HomeopathyFooter } from './HomeopathyFooter';

export interface HomeopathyShellProps {
  children: ReactNode;
}

/**
 * Shared page shell for every `/homeopathy/**` route: stylesheet, header
 * (with the real cart badge), page content, footer. Recreated from the
 * Herbs Store's `HerbsShell.tsx` wrapper pattern, minus the client-side
 * store provider / Quick View modal — this storefront has no parallel
 * wishlist/cart client state, it reads the real session cart directly in
 * the header (see `HomeopathyHeader`'s file header for why that makes it
 * an async Server Component).
 */
export async function HomeopathyShell({ children }: HomeopathyShellProps) {
  return (
    <div className="homeopathy-page-wrapper homeopathy-scope">
      <HomeopathyStylesheets />
      <HomeopathyHeader />
      {children}
      <HomeopathyFooter />
    </div>
  );
}
