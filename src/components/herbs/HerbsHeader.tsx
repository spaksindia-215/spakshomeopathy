'use client';

/**
 * Herbs Store header.
 * Uses the universal SiteHeader component with live cart count from useHerbsStore().
 */

import { useHerbsStore } from './HerbsStoreProvider';
import { SiteHeader } from '@/components/layout/SiteHeader';
import type { HerbProduct } from '@/lib/herbs/types';

export interface HerbsHeaderProps {
  catalog?: HerbProduct[];
}

export function HerbsHeader({ catalog: _catalog }: HerbsHeaderProps = {}) {
  const { cartCount } = useHerbsStore();

  return <SiteHeader cartCountOverride={cartCount} />;
}
