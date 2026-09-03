# OI-13 RESOLUTION REPORT — JSX Inter-Element Whitespace in Shared Header/Footer

**Issue:** OI-13 — header/footer elements horizontally offset up to ~18px vs production
**Status:** ✅ **RESOLVED**
**Date:** 2026-08-10
**Author:** Migration Implementer
**Authorization:** Owner — "Next, resolve OI-13 only", 2026-08-10
**Contract version:** 1.0
**Scope:** OI-13 only. **Milestone 2 was NOT begun.** `LegacyScriptRunner.tsx` **NOT modified.**

---

## 1. ROOT CAUSE

### 1.1 The mechanism

In the Blade source, every `</li>` and the following `<li>` are separated by a
**newline**:

```html
<ul class=" navigation-box">
<li class="current"><a href="...">Home</a></li>
<li><a href="...">About Us</a></li>
<li><a href="...">Herbs</a></li>
```

HTML collapses that newline into **one rendered space**. The `<li>` elements are
`display: inline-block` (confirmed via `getComputedStyle`), so — unlike block or
flex children — **that space is layout**. It occupies real horizontal width.

**JSX discards whitespace between elements when it contains a newline.** Prettier
formats each `<li>` onto its own line, so every inter-element space was silently
dropped at build time.

### 1.2 Why the offset "converged to zero"

Each missing space costs ~3px. The list is left-aligned, so the error accumulates
left-to-right and the *last* item lands in the same place only because the whole
row is narrower. Measured gaps confirmed it exactly:

| List | Production gap | Local gap (before) | Deficit |
|---|---|---|---|
| `navigation-box` | 35px | **32px** | −3px × 6 = **−18px** |
| `topbar-one__contact` | 3px | **0px** | −3px |
| social icons (`<ul>`, no class) | 3px | **0px** | −3px |
| `footer-one__bottom-links` | 21px | **18px** | −3px |

The one exception proved the diagnosis: the local `navigation-box` had **one**
35px gap (after "About Us") — precisely where a JSX comment on the following
line happened to preserve a space. Same markup, same CSS, one accidental space,
one correct gap.

### 1.3 Root cause, stated

> **Whitespace that is semantically significant in HTML was lost in JSX
> translation.** Not a CSS problem, not a spacing decision, not React runtime
> behavior — a build-time text-node omission in `inline-block` lists.

---

## 2. EVIDENCE

### 2.1 Raw production HTML vs Next.js server HTML

Production (`baseline/raw-html/about.guest.raw.html`):

```
'<ul class=" navigation-box">\n<li class="current"><a ...>Home</a></li>\n<li><a ...>About Us</a></li> \n...'
                              ↑ newline                              ↑ newline
```

Next.js server HTML (before fix):

```
'<ul class=" navigation-box"><li class="current"><a href="/">Home</a></li><li><a href="/about">About Us</a></li> <li>...'
                                                                          ↑ NO space            ↑ the one accidental space
```

### 2.2 Computed layout (JavaScript **disabled** — no plugin involvement)

```
BEFORE  PROD  gaps=[35,35,35,35,35,35,35]   ulWidth=890
        LOCAL gaps=[32,35,32,32,32,32,32]   ulWidth=872     ← 18px narrower

AFTER   PROD  gaps=[35,35,35,35,35,35,35]
        LOCAL gaps=[35,35,35,35,35,35,35]   ✅ EXACT MATCH
```

`display` confirmed: `ul` = `block`, `li` = **`inline-block`** on both sides —
which is why the whitespace is load-bearing.

### 2.3 Navigation item positions

| Item | PROD | LOCAL before | LOCAL after |
|---|---|---|---|
| Home | 300 | 318 (+18) | **300** ✅ |
| About Us | 381 | 396 (+15) | **381** ✅ |
| Herbs | 487 | 502 (+15) | **487** ✅ |
| Diseases Catalogue | 568 | 580 (+12) | **568** ✅ |
| Video | 751 | 760 (+9) | **751** ✅ |
| Mother Tincture | 832 | 838 (+6) | **832** ✅ |
| Potencies | 995 | 998 (+3) | **995** ✅ |
| Contact Us | 1106 | 1106 (0) | **1106** ✅ |

Identical with JavaScript **enabled and disabled** — confirming OI-13 is
independent of OI-10.

---

## 3. FILES CHANGED

| File | Change |
|---|---|
| `src/components/layout/PublicHeader.tsx` | Added `{' '}` between `<li>` siblings in `navigation-box` (7 separators) and `topbar-one__contact` (2) |
| `src/components/layout/PublicFooter.tsx` | Added `{' '}` between `<li>` siblings in the social-icons `<ul>` (2) and `footer-one__bottom-links` (2); restored the icon→text space in the Phone and Address items |

**Two files. No other file touched.** `LegacyScriptRunner.tsx` untouched
(verified). No CSS modified. No markup restructured. No margins or padding added.

---

## 4. EXACT CORRECTION

The single change, applied consistently:

```jsx
  </li>{' '}          ← explicit text node reproducing Blade's newline
  <li>
```

and for icon→text pairs, where Blade emits `</i>\n +91 8700458818`:

```jsx
  <i className="fa fa-phone" aria-hidden="true"></i> +91 8700458818
```

This satisfies rule 9 — *"If whitespace is semantically/significantly rendered by
the browser in production, reproduce that behavior explicitly in JSX."* It adds
**no spacing of its own**: it restores the exact space the browser renders from
the Blade source.

**Rules honored:** no redesign (1, 2), no typography change (3), no intentional
spacing change (4), no CSS change (5), no re-implementation (6), no arbitrary
margins (7), original structure preserved (8), whitespace made explicit (9).

---

## 5. BEFORE / AFTER MEASUREMENTS

### Pixel difference, `/about` desktop (vs live production, full page)

| Stage | Differing pixels | Ratio |
|---|---|---|
| Before | 17,772 / 2,671,200 | **0.6653%** |
| After header/footer lists | 5,910 | 0.2212% |
| After footer icon spaces | 3,614 | **0.1353%** |

Residual 0.1353% is confined to y 1433–1471 — the two `/about` appointment
buttons, a **page-body** element outside OI-13's scope. Raised as **OI-14** (§10).

### Page height and nav position — all 9 pages

| Viewport | Height delta | Nav-position delta |
|---|---|---|
| desktop 1440×900 | **0 on 9/9** | **0 on 9/9** |
| tablet 768×1024 | **0 on 9/9** | **0 on 9/9** |
| mobile 320×640 | 0 (see OI-15) | **0 on 9/9** |

---

## 6. SCREENSHOT VERIFICATION

`npx playwright test m1-screenshots.spec.ts` against the M0 production baseline:

| Project | Result |
|---|---|
| **chromium-desktop** | ✅ **9 / 9 PASSED** (re-run twice, stable) |
| **chromium-tablet** | ✅ **8 / 9** — sole failure `/video`, third-party (§10, OI-16) |
| chromium-mobile | 4 / 9 — failures are the Google Translate race (§10, OI-15) |

**Note on an earlier false signal.** The first desktop run reported 9/9 *failed*.
The cause was not parity: the suite targets `http://localhost:3000` while my
verification server ran on 3111, so every test hit `ERR_CONNECTION_REFUSED`.
Started on port 3000 → **9/9 passed**. Recorded so the next session does not
mistake a port mismatch for a visual regression.

---

## 7. CONSOLE VERIFICATION

| Viewport | Pages | PROD errors | LOCAL errors |
|---|---|---|---|
| desktop | 9 | 0 | **0** ✅ |
| tablet | 9 | 0 | **0** ✅ |
| mobile | 9 | 0 | **0** ✅ |

No new console errors. No hydration warnings. Nothing suppressed.

---

## 8. NETWORK VERIFICATION

| Viewport | Legacy assets PROD | LOCAL | Missing | Extra |
|---|---|---|---|---|
| desktop | 25 | 25 | **0** ✅ | **0** ✅ |
| tablet | 25 | 25 | **0** ✅ | **0** ✅ |
| mobile | 25 | 25 | **0** ✅ | **0** ✅ |

Unchanged by this fix, as expected — whitespace affects no requests.

### Build & static checks

| Check | Result |
|---|---|
| `npm run typecheck` | ✅ PASS |
| `npm run lint` | ✅ PASS |
| `npm run format:check` | ✅ PASS |
| `npm run test` | ✅ PASS 7/7 |
| `npm run build` | ✅ clean |

*Prettier reformatted two `{' '}` separators into literal inline spaces
(`</i> +91 …`). Semantically identical in JSX; rendered output verified to still
contain the space.*

---

## 9. CONFIRMATION THAT OI-10 REMAINS RESOLVED

`LegacyScriptRunner.tsx` was **not modified**. Re-verified after the OI-13 fix:

| Measure | PROD | LOCAL |
|---|---|---|
| `.stricked-menu` | 1 | **1** ✅ |
| `.stricky-fixed` @ scrollTop 0 → 600 | 0 → 1 | **0 → 1** ✅ |
| `.owl-loaded` | 1 | **1** ✅ |
| `.owl-item` | 27 | **27** ✅ |
| `.owl-nav` + `.owl-dots` | 2 | **2** ✅ |
| Magnific Popup / WOW registered | true | **true** ✅ |
| `/details` height | 1881 | **1881** ✅ |

Idempotency re-verified: 9 scripts, 1 nav clone, 1 Owl init, height stable
across reload. **OI-10 is not regressed.**

---

## 10. REMAINING BLOCKERS AND NEW ISSUES

Per instruction, distinct defects found while fixing OI-13 are **documented, not
fixed**.

### OI-14 (**new**) — page-body whitespace on `/about`

Same defect class, different location: `src/app/about/page.tsx:142-146`. Blade
emits `</a>\n<a ...>` between the two appointment buttons; JSX drops it.
Accounts for the residual 0.1353% pixel diff on `/about` desktop.

- **Scope:** `/about` only (the other 8 pages contain no `class="btn "` elements).
- **Not fixed** — OI-13's objective is explicitly the *shared header/footer*.
- **Severity:** Low. Desktop screenshot still passes within tolerance.

### OI-15 (**new**) — Google Translate async race at mobile viewport

The Google Translate widget injects a ~61px banner asynchronously. At 320px it
sometimes has not rendered when the screenshot is taken, making the page 2938px
instead of 2999px.

- Reproduced by varying the settle delay: 1000ms → 2999, 2200ms → 2999,
  **3400ms → 2938**, 4600ms → 2999. Non-deterministic.
- Five consecutive live runs: PROD `[2999×5]` stable; LOCAL `[2999,2999,2999,2938,2999]`.
- Section-by-section measurement at 320px shows `/terms` **2999 = 2999, delta 0** —
  every section identical when the widget has loaded.
- **Cause:** third-party async timing, not markup. Likely needs an explicit wait
  for the widget in the screenshot harness rather than a source change.
- **Severity:** Medium — makes mobile V-02 flaky, not wrong.

### OI-16 (**new**) — YouTube overlay chrome on `/video` (tablet)

Tablet `/video` differs by 0.02% at identical dimensions. Visual inspection of
expected-vs-actual shows **identical thumbnails**; only YouTube's own "Watch on
YouTube" overlay chrome renders inconsistently. Third-party, outside our markup.
**Severity:** Low.

### Pre-existing, unchanged

| ID | Status |
|---|---|
| **OI-1a / OI-1b** | ⛔ Owner-supplied buyer/admin credentials — open since M0; block M1 gate closure |
| **OI-2 / OI-6** | ⛔ Owner-supplied `sql_mode` capture + fresh production export — block M3 |

---

## 11. CONCLUSION

**OI-13 is resolved.** Inter-element whitespace that HTML renders as significant
layout was lost in JSX translation across four `inline-block` lists in the shared
header and footer. Restoring it explicitly gives **exact positional parity** with
production — verified with JavaScript both enabled and disabled, confirming
independence from OI-10.

Desktop screenshots pass **9/9** against the M0 production baseline, at zero
height and zero nav-position delta across all three viewports.

**M1's gate still cannot close:** OI-1a/OI-1b remain owner-blocked since M0.
**M3 remains NOT AUTHORIZED** (OI-2, OI-6). **Milestone 2 was not begun.**

---

*End of OI-13 Resolution Report*
