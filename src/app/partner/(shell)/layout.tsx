import type { ReactNode } from 'react';
import { PartnerHeader } from '@/components/partner/PartnerHeader';
import { PartnerSidebar } from '@/components/partner/PartnerSidebar';
import { PartnerFooter } from '@/components/partner/PartnerFooter';
import { AdminScripts } from '@/components/admin/AdminScripts';
import { requirePartnerSession } from '@/lib/auth/guard';
import { getDb } from '@/lib/mongodb/client';
import { UserRepository } from '@/lib/mongodb/repositories/userRepository';

/**
 * Partner shell layout. Partner Panel feature — mirrors
 * `admin/(shell)/layout.tsx`'s architecture exactly: `requirePartnerSession()`
 * is the sole gate for every page this layout wraps (layout-level guard,
 * not `middleware.ts` — see `guard.ts`'s header for why that's the
 * established pattern in this codebase), and `/partner/login` deliberately
 * lives OUTSIDE this route group as a sibling folder, rendering with no
 * shell chrome.
 *
 * Reuses `AdminScripts` directly (jQuery/Bootstrap/AdminLTE JS baseline) —
 * it's a generic asset-loading component, not admin-specific in behavior,
 * so duplicating it for the partner panel would be pure repetition.
 */
export default async function PartnerLayout({ children }: { children: ReactNode }) {
  const session = await requirePartnerSession();
  const db = await getDb();
  const user = await new UserRepository(db).findByLegacyId(session.userId);
  const name = user?.name ?? session.email;

  return (
    <div className="wrapper">
      <PartnerHeader name={name} />
      <PartnerSidebar name={name} />

      <div className="content-wrapper">{children}</div>

      <PartnerFooter />
      <AdminScripts />
    </div>
  );
}
