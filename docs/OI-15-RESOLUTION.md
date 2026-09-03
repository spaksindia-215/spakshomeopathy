# OI-15 RESOLUTION REPORT — Google Translate Capture Race

**Issue:** OI-15 — mobile V-02 flakiness; pages captured 61px short
**Status:** ✅ **RESOLVED** (harness corrected; application proven correct)
**Date:** 2026-08-10
**Author:** Migration Implementer
**Authorization:** Owner — "Proceed with OI-14, OI-15, and OI-16", 2026-08-10
**Scope:** OI-15 only. **Application NOT modified** — the fix is entirely in the
verification harness, as required.

---

## 1. CLASSIFICATION

The owner asked whether this is a capture-harness timing problem, an application
problem, or a production behavior difference.

**Answer: primarily a HARNESS problem, with an irreducible PRODUCTION-BEHAVIOR
component. It is NOT an application problem.**

| Candidate | Verdict |
|---|---|
| **Capture-harness timing** | ✅ **Confirmed, and the dominant cause** — fixed (§3) |
| **Production behavior** | ✅ **Confirmed, residual** — the widget is nondeterministic on production too (§2.4) |
| **Application problem** | ❌ **Ruled out** — all 9 pages byte-identical to production when compared like-for-like (§2.5) |

---

## 2. EVIDENCE

### 2.1 What adds the 61px

The Google Translate widget (`#google_translate_element`, present in
`inc/header.blade.php` on every public page) injects a banner asynchronously.
Sampling the DOM every 150ms at 320px:

```
    0ms  h=360   combo=false banner=false bannerDivH=0
  150ms  h=287   combo=false banner=false bannerDivH=0
  300ms  h=2938  combo=false banner=false bannerDivH=0    ← page laid out
  450ms  h=2938  combo=true  banner=true  bannerDivH=0    ← script ran
  600ms  h=2999  combo=true  banner=true  bannerDivH=61   ← banner adds 61px
```

`div.skiptranslate` gaining non-zero height is the exact moment the banner
contributes layout — the deterministic observable to wait for.

### 2.2 The harness was using an arbitrary sleep

`tests/e2e/m1-screenshots.spec.ts` did:

```ts
await page.goto(PATH_FOR[id]);
await page.waitForTimeout(2500);   // ← arbitrary; a race, not a condition
```

`scripts/capture-baseline.ts` had the same defect (`waitForTimeout(1500)` after
a widget-attached check). Under load the budget was occasionally missed,
capturing 2938px instead of 2999px.

### 2.3 The readiness condition is deterministic

Waiting for `div.skiptranslate` height > 0 instead of sleeping:

```
PROD   heights=[2999 ×6]   readyMs=[828,729,736,738,919,727]
LOCAL  heights=[2999 ×6]   readyMs=[663,599,641,658,659,635]
```

**12/12 runs identical.** Ready at ~600ms local, ~730–920ms production — both
comfortably inside the old 2500ms budget *most* of the time, which is exactly
why the failure was intermittent rather than constant.

### 2.4 The irreducible part: production itself is nondeterministic

Reproducing the original M0 recipe (`networkidle` + 2500ms) on `/about` at 320px:

```
PROD   3427/61   3366/-1   3427/61   3366/-1   3427/61     ← FLIPS
LOCAL  3427/61   3427/61   3427/61   3427/61   3427/61
```

Banner-present frequency over 8 consecutive runs each:

| Page | PROD | LOCAL |
|---|---|---|
| `/video` | **6/8 present, 2/8 absent** | **8/8 present** |
| `/details` | 8/8 present | 8/8 present |

**Production is the less stable side.** The widget is third-party and loaded
over the network; neither application controls whether it renders.

### 2.5 The application is correct — decisive test

Comparing like-for-like (both sides gated to the banner-present state, removing
third-party variance from the comparison), mobile 320×640:

```
page               prodH  localH  delta
about               3427    3427      0
contact             2643    2643      0
terms               2999    2999      0
privacy-policy     14253   14253      0
return-policy       2710    2710      0
mother-tincture     2162    2162      0
videos              1468    1468      0
video               2624    2624      0
details             3362    3362      0

APP CORRECTNESS: all 9 pages identical when compared like-for-like
```

**All 9 pages match production exactly, and every value equals the M0 baseline
height.** There is no application defect.

---

## 3. CORRECTION APPLIED

**No application file was modified.** Changes are confined to the harness.

### 3.1 `tests/e2e/m1-screenshots.spec.ts`

The `waitForTimeout(2500)` was replaced by a chain of deterministic observables:

| # | Gate | Observable | Required? |
|---|---|---|---|
| 1 | Translate script ran | `.goog-te-combo` exists | Awaited, not required |
| 2 | Banner contributes layout | `div.skiptranslate` height > 0 | Awaited, not required |
| 3 | **Layout settled** | `document.body.scrollHeight` unchanged across 3 consecutive animation frames | Yes |
| 4 | Legacy widgets ready | every `.owl-carousel` has `.owl-loaded` | Yes (no-op if none) |
| 5 | Fonts ready | `document.fonts.ready` | Yes |
| 6 | Images **decoded** | `img.decode()` for every image | Yes |

Gates 1 and 2 are **awaited but not required** — deliberately. §2.4 proves the
widget is nondeterministic on production, and `/terms` legitimately renders
without the banner on some loads. Hard-requiring them made the suite hang on
pages that were already correct.

Gate 3 is the substantive fix: it observes **the quantity actually under test**
(page height) reaching a fixed point, rather than guessing a duration.

Gate 6 was added after `fullPage` stitching captured one `/about` product photo
as a blank box — `complete` (bytes fetched) does not imply painted; `decode()`
resolves only when the bitmap is paint-ready.

### 3.2 `scripts/capture-baseline.ts`

The same gate chain replaces `waitForTimeout(1500)`, so the **baseline and the
comparison are captured at the same lifecycle point**. Without this the baseline
would keep freezing arbitrary outcomes — the original defect.

### 3.3 Constraints honored

| Requirement | Status |
|---|---|
| Application not modified to ease testing | ✅ **Zero application changes** |
| No arbitrary long sleeps | ✅ All fixed sleeps removed from the screenshot path |
| No retries turning failures into passes | ✅ **No retry logic.** A failed comparison is never re-run. Gates 1–2 tolerate a missing third-party widget; they never re-attempt a comparison. |
| Deterministic observable condition | ✅ Gate 3 (height fixed point) is the primary gate |

---

## 4. STABILITY RESULTS

### 4.1 Harness improvement

Mobile suite, consecutive runs:

| Stage | Passing |
|---|---|
| Before (2500ms sleep) | 4 / 9 |
| After gates 1–3 | 6–7 / 9 |
| After baseline re-capture with matching gates | see M1 Gate Report §13.8 |

### 4.2 Baseline re-capture

Because the baseline had frozen one arbitrary outcome of a nondeterministic
widget — every mobile baseline was captured **with** the banner — it was
re-captured from **live production** using the corrected gates. T-1 is
preserved: the baseline remains a production capture, not a local render.
Previous screenshots were backed up before overwriting.

---

## 5. REMAINING LIMITATIONS

1. **Production's own nondeterminism cannot be eliminated.** §2.4 shows
   production yields the banner on ~6/8 loads for `/video`. When the baseline
   holds the banner state and a comparison run does not (or vice versa), the
   heights differ by 61px and the comparison fails. This is **third-party
   variance, not an application defect** — proven by §2.5.

2. **Consequence for V-02:** mobile screenshot comparison may still show
   intermittent failures on pages where the widget fails to load on either side.
   The correct interpretation is documented here so a future session does not
   re-investigate it as an application bug. A future harness improvement could
   assert height ∈ {with-banner, without-banner} rather than a single value, but
   that weakens the assertion and was not undertaken without approval.

3. **`document.fonts.ready` / `decode()`** are widely supported in Chromium and
   fine for this suite; other engines are untested (cross-browser is an M13
   activity).

---

## 6. SCOPE COMPLIANCE

| Constraint | Status |
|---|---|
| No Milestone 2 / 3 work | ✅ |
| No CR-001 / CR-002 / settings system | ✅ |
| Business logic / auth / DB / Laravel source unmodified | ✅ |
| **Application modified to ease the harness** | ❌ **No** — required |
| Arbitrary long sleeps | ❌ **No** — required |
| Retries masking failures | ❌ **No** — required |
| `LegacyScriptRunner.tsx` unmodified | ✅ |

---

## 7. ADDENDUM — snapshot-naming defect found during final verification

A second, unrelated harness defect surfaced while re-running the full suite and
is recorded here because it initially looked like more GT flakiness.

**Playwright sanitizes dots in snapshot names into hyphens.** The spec
requested `toHaveScreenshot(\`${id}.guest.${suffix}.png\`)`, but Playwright
resolved that to `<id>-guest-<suffix>.png` on disk — a **different file** from
the dot-named production captures (`<id>.guest.<suffix>.png`) that
`capture-baseline.ts` actually writes. Two consequences:

1. Every run "requested" a baseline that was never captured. Playwright's
   default `updateSnapshots: 'missing'` **auto-wrote** the requested file from
   whatever the local app rendered at that moment — silently creating a
   self-referential "baseline" instead of failing loudly. This is exactly what
   T-1 exists to prevent.
2. Once auto-created, those hyphen-named files were then compared against
   *themselves* on subsequent runs (false passes) or against a *different*
   local render if timing shifted (false failures) — a second, independent
   source of the flakiness originally attributed only to the GT widget.

**Fix, in two parts:**

- `playwright.config.ts`: `updateSnapshots: 'none'`. A missing baseline is now
  a **hard error**, never a silent write. This is a general harness safety
  improvement, not specific to OI-15, but it was found while investigating it.
- `capture-baseline.ts`: writes **both** spellings (`<id>.guest.<vp>.png` and
  `<id>-guest-<vp>.png`) so the file Playwright actually compares against is a
  genuine production capture, never an auto-generated stand-in.
- `m1-screenshots.spec.ts`: requests the hyphen form directly, matching what
  Playwright resolves, so there is no more silent rewrite in the lookup path.

Verified: `about-guest-desktop.png` (hyphen, now written directly from
production) is **pixel-identical** to `about.guest.desktop.png` (dot form,
same capture) — confirming the two spellings are not a source of drift, only
of the earlier confusion.

## 8. FINAL STABILITY (after all OI-15/16/17 corrections)

| Viewport | Passing (typical) | Note |
|---|---|---|
| Desktop | 9/9, or 8/9 | Failure, when it occurs, is `/details` (OI-17 — Owl autoplay, not GT) |
| Tablet | 9/9, or 8/9 | Same — `/details` only |
| Mobile | 9/9, 7/9, or 6/9 | Residual flakiness is `/about` / `/contact` / `/details`; GT (this issue) and Owl (OI-17) overlap at this viewport |

Mobile is the only viewport where OI-15's residual nondeterminism (§5.1) is
still directly observable. Desktop/tablet failures are **OI-17**, a distinct
third-party widget — see `docs/OI-17-RESOLUTION.md`.

---

*End of OI-15 Resolution Report*
