import type { ReactNode } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminFooter } from '@/components/admin/AdminFooter';
import { AdminScripts } from '@/components/admin/AdminScripts';
import { requireAdminSession } from '@/lib/auth/guard';

/**
 * Admin shell layout. Reproduces the `<div class="wrapper">` structure
 * common to every `admin/*.blade.php` view: `body.hold-transition.skin-blue
 * .sidebar-mini` wrapping `@include('admin.inc.header')`,
 * `@include('admin.inc.sidebar')`, a `.content-wrapper` (page-specific
 * content goes here as `children`), and `@include('admin.inc.footer')`.
 *
 * UNVERIFIED AGAINST PRODUCTION (M1 Gate Report OI-1b): see AdminHeader.tsx.
 *
 * UPDATED (M4-DEMO Phase 1, 2026-08-21): admin pages now exist under
 * `src/app/admin/`. `AdminStylesheets` remains page-specific (not wired
 * here) — confirmed this session that every admin page shares the same
 * CSS baseline, so in principle it COULD live here, but it is kept
 * per-page to match the public-site's own `PublicStylesheets` convention
 * (imported explicitly by each page) and to keep this layout's job
 * strictly to structural shell, not asset loading. `AdminScripts` (the
 * confirmed page-INVARIANT JS baseline: jquery/bootstrap/slimscroll/
 * fastclick/adminlte/demo.js) IS wired here, since unlike stylesheets its
 * behavior (the post-hydration handoff) only needs to run once per shell
 * mount, not once per page.
 *
 * ROUTE GROUP: this file lives at `src/app/admin/(shell)/layout.tsx` —
 * the `(shell)` segment is a Next.js route group (parentheses = excluded
 * from the URL). Every shell-wrapped page lives under
 * `src/app/admin/(shell)/<route>/page.tsx` and still resolves to
 * `/admin/<route>` exactly as if `(shell)` weren't there. `/admin/login`
 * deliberately lives OUTSIDE this group, at `src/app/admin/login/page.tsx`
 * (a sibling of the `(shell)` folder, not inside it) — it renders with NO
 * sidebar/header/footer, matching `login.blade.php`'s own standalone
 * `<body class="hold-transition login-page">` structure in source, which
 * has none of the three shell partials.
 *
 * ROUTE PROTECTION (M4 auth slice, added here): `requireAdminSession()`
 * (`src/lib/auth/guard.ts`) is called unconditionally before rendering
 * any shell-wrapped page — this is the ONLY gate for every route this
 * layout wraps, mirroring `routes/admin.php`'s `userAuth` middleware
 * group exactly 1:1 (every route in that group, and only those routes,
 * has a page under `(shell)`). Unauthenticated, forged, expired, or
 * wrong-role (non-utype=1) sessions are redirected to `/admin/login`
 * server-side before any admin markup is produced — the demo bypass
 * link on that page (`/admin/home` with no session) is consequently no
 * longer effective; see that file's own updated comment.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminSession();

  return (
    <div className="wrapper">
      <AdminHeader />
      {/* Left side column. contains the logo and sidebar */}
      <AdminSidebar />

      {/* Content Wrapper. Contains page content */}
      <div className="content-wrapper">{children}</div>

      <AdminFooter />
      <AdminScripts />
    </div>
  );
}
