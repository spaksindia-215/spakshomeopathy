/**
 * Admin panel footer (AdminLTE). Ported from `admin/inc/footer.blade.php`.
 *
 * UNVERIFIED AGAINST PRODUCTION (M1 Gate Report OI-1b) — see AdminHeader.tsx.
 *
 * CORRECTED (M4-DEMO Phase 1, 2026-08-21): the text below previously read
 * "All rights reserved." — verified directly against
 * `public_html/resources/views/admin/inc/footer.blade.php` this session:
 * the real source says literally "All reserved." (the word "rights" is
 * missing — a real, preserved defect, not a typo introduced by this
 * migration). This file was wrong relative to source; corrected here to
 * match reality, not the other way around.
 */
export function AdminFooter() {
  return (
    <footer className="main-footer">
      <div className="pull-right hidden-xs">
        <b>Version</b> 2.4.13
      </div>
      <strong>
        Copyright &copy; 2020 <a href="#">Spaks</a>.
      </strong>{' '}
      All reserved.
    </footer>
  );
}
