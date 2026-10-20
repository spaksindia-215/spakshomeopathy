'use client';

/**
 * Homeopathy Store header.
 * Uses the universal SiteHeader component with live cart count from useHomeopathyStore().
 */

import { useHomeopathyStore } from './HomeopathyStoreProvider';
import { SiteHeader } from '@/components/layout/SiteHeader';

export function HomeopathyHeader() {
  const { cartCount } = useHomeopathyStore();

  return <SiteHeader cartCountOverride={cartCount} />;
}
