'use client';

import { useEffect } from 'react';

/**
 * Admin-panel equivalent of `src/components/layout/LegacyScriptRunner.tsx`
 * — SAME technique (load legacy scripts only after React hydration has
 * settled, via a double-`requestAnimationFrame` handoff, idempotent by
 * both a DOM-attribute flag and a script-tag-presence check), applied to
 * a COMPLETELY SEPARATE asset stack (AdminLTE 2.x / Bootstrap 3.3.7 /
 * jQuery 3, not the public site's Bootstrap-5-ish theme). This file does
 * not import or modify `LegacyScriptRunner.tsx` — see that file's own
 * extensive header comment for the full OI-10 DOM-ownership-conflict
 * reasoning this mirrors; not repeated here to avoid drift between two
 * copies of the same explanation.
 *
 * Script list confirmed as the common baseline across every admin page
 * this session (login/index/profile/change-password/list/add/edit all
 * load exactly these six, in this order, before any page-specific extra
 * scripts). Per-page ADDITIVE scripts (DataTables init, CKEditor's real
 * CDN script — intentionally NOT loaded, see CKEditorPlaceholder.tsx —
 * iCheck on login, jvectormap/morris/etc. on the dashboard) are added
 * inline on the pages that actually use them, not here.
 */
const ADMIN_LEGACY_SCRIPTS = [
  '/admin-assets/bower_components/jquery/dist/jquery.min.js',
  '/admin-assets/bower_components/bootstrap/dist/js/bootstrap.min.js',
  '/admin-assets/bower_components/jquery-slimscroll/jquery.slimscroll.min.js',
  '/admin-assets/bower_components/fastclick/lib/fastclick.js',
  '/admin-assets/dist/js/adminlte.min.js',
  '/admin-assets/dist/js/demo.js',
] as const;

const INSTALLED_FLAG = 'data-admin-legacy-scripts-installed';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = false; // preserve execution order
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(el);
  });
}

export function AdminScripts() {
  useEffect(() => {
    if (document.documentElement.hasAttribute(INSTALLED_FLAG)) return;
    document.documentElement.setAttribute(INSTALLED_FLAG, 'true');

    let cancelled = false;

    const handle = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        void (async () => {
          for (const src of ADMIN_LEGACY_SCRIPTS) {
            if (cancelled) return;
            try {
              await loadScript(src);
            } catch (err) {
              console.error(err);
            }
          }
        })();
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(handle);
    };
  }, []);

  return null;
}
