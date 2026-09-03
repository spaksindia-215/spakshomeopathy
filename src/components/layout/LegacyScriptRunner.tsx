'use client';

import { useEffect } from 'react';

/**
 * OI-10 — jQuery interoperability layer.
 *
 * =========================================================================
 * THE PROBLEM
 * =========================================================================
 * `theme.js` is a bare IIFE — `(function($){ ... })(jQuery)` — with NO
 * `$(document).ready()` wrapper. It executes the instant the browser parses
 * its <script> tag, and every widget is guarded by a presence check:
 *
 *     if ($('.stricky').length)  { ...clone the nav... }
 *     if ($('.recent-products__carousel').length) { ...owlCarousel()... }
 *
 * In Laravel that is fine: the scripts sit at the very end of <body>, so the
 * markup already exists and nothing ever touches it again.
 *
 * Under Next.js the markup also exists at parse time — measured, jQuery DOES
 * initialize correctly, and at DOMContentLoaded the local DOM matches
 * production EXACTLY (stricked-menu=1, owl-loaded=1).
 *
 * The failure happens AFTERWARDS. React hydration runs at ~955ms, walks the
 * server-rendered tree, finds DOM that no longer matches its virtual DOM —
 * because jQuery moved `.item` nodes into Owl's generated `.owl-stage-outer`
 * and inserted a `.stricked-menu` clone — and REVERTS all of it to what the
 * server sent, raising React error #418. Verified by MutationObserver:
 *
 *     [627ms] ADDED   <NAV class="...stricky">          (jQuery clone)
 *     [628ms] ADDED   <DIV class="owl-stage-outer">     (Owl)
 *     [699ms] --- DOMContentLoaded ---   stricked=1 owlLoaded=1  ✅
 *     [955ms] REMOVE  <DIV class="item"> from .recent-products__carousel  ×15
 *     [1148ms] --- load ---              stricked=0 owlLoaded=0  ❌
 *
 * So this is NOT "jQuery ran too early" and NOT "the DOM was missing". It is
 * a DOM-OWNERSHIP conflict: both libraries claim the same nodes, and React,
 * running second, wins.
 *
 * =========================================================================
 * THE FIX
 * =========================================================================
 * Run the legacy scripts AFTER hydration has finished, so React has already
 * settled and will not re-walk that subtree again. React renders the markup;
 * jQuery then takes ownership of it and is never contradicted.
 *
 * This is the smallest possible intervention:
 *   - Plugin source is NOT modified.                            (req. 8)
 *   - Widget behavior is NOT reimplemented in React.       (F-23, req. 9)
 *   - Script ORDER is preserved exactly as Laravel emits it.    (req. 3)
 *   - Markup, selectors, classes, ids, data-attrs unchanged.   (req. 10)
 *   - jQuery's DOM mutations are ALLOWED to stand.             (req. 11)
 *   - No `suppressHydrationWarning`, no silenced errors.  (req. 15/16/17)
 *
 * Because the plugin-owned subtrees are static server components that never
 * re-render, React never overwrites the mutations afterwards. (req. 12/13)
 *
 * =========================================================================
 * DOM OWNERSHIP
 * =========================================================================
 * React-owned  : all server-rendered markup, up to the moment this effect
 *                runs. React renders it once and never re-renders it (every
 *                page in scope is a static server component; no state, no
 *                props change, no client re-render can be triggered).
 * jQuery-owned : after this effect runs — the `.stricked-menu` nav clone,
 *                Owl's `.owl-stage-outer`/`.owl-stage`/`.owl-item` wrappers
 *                and the `.item` nodes it relocates into them, WOW's
 *                `animated` classes, Magnific Popup's overlay, and the
 *                accordion show/hide state.
 *
 * The handoff is one-way and happens exactly once per page load.
 */

/** Exact order Laravel emits these in — see resources/views/*.blade.php. */
const LEGACY_SCRIPTS = [
  '/assets/js/jquery.js',
  '/assets/js/bootstrap.bundle.min.js',
  '/assets/js/bootstrap-select.min.js',
  '/assets/js/owl.carousel.min.js',
  '/assets/js/jquery.magnific-popup.min.js',
  '/assets/js/bootstrap-datepicker.min.js',
  '/assets/js/jquery.validate.min.js',
  '/assets/js/wow.min.js',
  '/assets/js/theme.js',
] as const;

/**
 * Marks the document once the legacy stack has been installed, so a remount
 * (React 18/19 StrictMode double-invokes effects in development, and Fast
 * Refresh remounts freely) cannot run `theme.js` twice. Running it twice
 * would clone the sticky nav again and double-initialize every carousel.
 *
 * A `<script>` already in the document is also skipped by URL, so the guard
 * is belt-and-braces: idempotent by flag AND by tag presence. (req. 6/7)
 */
const INSTALLED_FLAG = 'data-legacy-scripts-installed';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already present (e.g. a previous mount, or a client-side navigation
    // back to this page) — do not add it a second time.
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = false; // preserve execution order (req. 3)
    el.onload = () => resolve();
    // A failed legacy script must not block the rest of the chain: that is
    // what production does too (23 assets 404 there — M1 §13.5 E).
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(el);
  });
}

export function LegacyScriptRunner() {
  useEffect(() => {
    if (document.documentElement.hasAttribute(INSTALLED_FLAG)) return;
    document.documentElement.setAttribute(INSTALLED_FLAG, 'true');

    let cancelled = false;

    // Two rAFs: the first fires after the current commit is painted, the
    // second guarantees we are past React's hydration work entirely. Only
    // then do we hand the DOM over to jQuery.
    const handle = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        void (async () => {
          for (const src of LEGACY_SCRIPTS) {
            if (cancelled) return;
            try {
              await loadScript(src);
            } catch (err) {
              // Surface it — contract req. 17 forbids hiding console errors.
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
