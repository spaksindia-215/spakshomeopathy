import type { ReactNode } from 'react';
import { HomeopathyStylesheets } from './HomeopathyStylesheets';
import { HomeopathyStoreProvider } from './HomeopathyStoreProvider';
import { HomeopathyHeader } from './HomeopathyHeader';
import { HomeopathyFooter } from './HomeopathyFooter';
import { QuickViewModal } from './QuickViewModal';
import { CartToast } from './CartToast';

export interface HomeopathyShellProps {
  children: ReactNode;
}

/**
 * Shared page shell for every `/homeopathy/**` route: stylesheet, client
 * store provider, header (with the client cart/wishlist badges), page
 * content, footer, and the Quick View modal. Recreated from the Herbs
 * Store's `HerbsShell.tsx` wrapper pattern — now including the client-side
 * store provider and Quick View modal too, matching Herbs exactly, per
 * the owner's request that Add to Cart behave identically on both
 * storefronts. `HomeopathyHeader` reads the new client store instead of
 * the real session cart, so this is a plain (non-async) component again.
 */
export function HomeopathyShell({ children }: HomeopathyShellProps) {
  return (
    <HomeopathyStoreProvider>
      <div className="homeopathy-page-wrapper homeopathy-scope">
        <HomeopathyStylesheets />
        <HomeopathyHeader />
        {children}
        <HomeopathyFooter />
        <QuickViewModal />
        <CartToast />
      </div>
    </HomeopathyStoreProvider>
  );
}
