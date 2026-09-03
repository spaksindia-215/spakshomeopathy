# OI-16 RESOLUTION REPORT — YouTube Third-Party Rendering Variance

**Issue:** OI-16 — `/video` screenshot differs ~0.02% at identical dimensions
**Status:** ✅ **RESOLVED** (scoped mask, evidence-based)
**Date:** 2026-08-10
**Author:** Migration Implementer
**Authorization:** Owner — "Proceed with OI-14, OI-15, and OI-16", 2026-08-10
**Scope:** OI-16 only. **Application markup and CSS unmodified.**

---

## 1. CLASSIFICATION

The owner asked whether the difference is caused by third-party YouTube UI,
browser/environment differences, production-vs-local rendering, or application
markup/CSS.

**Answer: third-party YouTube-rendered UI, conclusively.**

Application markup and CSS are provably identical — see §2.

---

## 2. EVIDENCE

### 2.1 The embeds are identical in every respect the application controls

Measured at tablet (768×1024) on `/video`, both sides:

| # | `src` | Geometry (w×h @ x,y) PROD | Geometry LOCAL |
|---|---|---|---|
| 1 | `youtube.com/embed/kRhNIVf6qUg` | 200×200 @ 54,406 | **200×200 @ 54,406** |
| 2 | `youtube.com/embed/_ev-w9J347g` | 200×200 @ 284,406 | **200×200 @ 284,406** |
| 3 | `youtube.com/embed/-cyfQkEp510` | 200×200 @ 514,406 | **200×200 @ 514,406** |
| 4 | `youtube.com/embed/ABYZYvUdiZo` | 200×200 @ 54,613 | **200×200 @ 54,613** |
| 5 | `youtube.com/embed/wEJkVFnOBgo` | 200×200 @ 284,613 | **200×200 @ 284,613** |
| 6 | `youtube.com/embed/F9B4kcXNt1Q` | 200×200 @ 514,613 | **200×200 @ 514,613** |
| 7 | (empty src) | 0×0 @ 0,0 | 0×0 @ 0,0 |

**Same count (7), same video IDs, same order, pixel-identical positions and
sizes.** Nothing the application renders differs.

### 2.2 What actually differs

Screenshot diff (tablet `/video`): **identical image dimensions**, 12,510
differing pixels (**0.02%**), bounded to `(56,556)–(714,797)` — precisely the
iframe grid region.

Visual comparison of expected vs actual crops: **thumbnails are identical**. The
only difference is YouTube's own overlay chrome — the "Watch on YouTube" bar and
share/title affordances — which YouTube paints inside the iframe and which
appears **non-deterministically between loads**.

### 2.3 Ruling out the alternatives

| Hypothesis | Verdict |
|---|---|
| Application markup/CSS | ❌ Ruled out — §2.1 shows identical geometry |
| Production vs local rendering | ❌ Ruled out — same iframes, same positions |
| Browser/environment | ❌ Ruled out — same browser/viewport both sides |
| **Third-party YouTube UI** | ✅ **Confirmed** — variance is inside the iframe only |

---

## 3. CORRECTION APPLIED

Per instruction, the embed and application markup were **not** modified to force
screenshot equality. Instead the harness masks **only** the third-party region.

`tests/e2e/m1-screenshots.spec.ts`:

```ts
const youtubeEmbeds = page.locator('iframe[src*="youtube.com/embed"]');

await expect(page).toHaveScreenshot(`${id}.guest.${suffix}.png`, {
  fullPage: true,
  mask: [youtubeEmbeds],
  maskColor: '#FF00FF',
});
```

The identical mask was added to `scripts/capture-baseline.ts` so the baseline and
the comparison are produced the same way — otherwise every masked page would
diff against an unmasked baseline.

### 3.1 Why this is the smallest justified tolerance

| Requirement | How it is met |
|---|---|
| Evidence-based | Scoped to the exact elements proven third-party in §2 |
| Smallest possible | A **selector-scoped mask**, not a pixel budget |
| Only the affected region | `iframe[src*="youtube.com/embed"]` — nothing else |
| Surrounding UI not masked | Everything outside the iframe rectangles is compared strictly |
| **No page-level tolerance** | ✅ **`maxDiffPixelRatio` was NOT raised.** It remains at the pre-existing project-wide `0.01`. |
| Pages without embeds unaffected | The locator matches nothing; no mask is applied |

**Critically, iframe *position* is still asserted.** The mask covers what YouTube
paints inside each frame; the frame's own geometry is part of the surrounding
page image. A layout regression that moved or resized an embed would still fail
the comparison — only YouTube's internal pixels are excluded.

A page-level tolerance was explicitly rejected: raising `maxDiffPixelRatio` to
absorb 0.02% would also silently absorb unrelated regressions of the same
magnitude anywhere on the page.

---

## 4. AFFECTED PAGES

| Page | Embeds | Masked |
|---|---|---|
| `/video` | 6 | Yes |
| `/details` | present | Yes |
| about, contact, terms, privacy-policy, return-policy, mother-tincture, videos | 0 | No — locator matches nothing |

---

## 5. VERIFICATION

Consolidated cross-viewport results are in the M1 Gate Report §13.8.

| Check | Result |
|---|---|
| Application markup modified | ❌ **No** — required |
| Embed modified | ❌ **No** — required |
| `maxDiffPixelRatio` changed | ❌ **No** — remains 0.01 |
| Mask scoped to third-party only | ✅ |
| Surrounding UI still compared | ✅ |
| Baseline re-captured with matching mask | ✅ (from live production — T-1 preserved) |

---

## 6. REMAINING LIMITATIONS

1. **The masked region is not visually verified.** By definition, YouTube's
   internal rendering is no longer compared. This is the intended trade — it is
   not ours to control — but it means a change *inside* an embed (e.g. a video
   removed by its owner) would not be caught by screenshot comparison. Video
   `src` attributes are still asserted by the DOM-parity checks, so a changed or
   missing embed URL would surface there.

2. **Mask colour `#FF00FF`** is arbitrary but deterministic; it only needs to be
   identical on both sides, which it is.

---

## 7. SCOPE COMPLIANCE

| Constraint | Status |
|---|---|
| No Milestone 2 / 3 work | ✅ |
| No CR-001 / CR-002 / settings system | ✅ |
| Business logic / auth / DB / Laravel source unmodified | ✅ |
| Embed or markup changed to force equality | ❌ **No** — required |
| Broad page-level tolerance used | ❌ **No** — required |
| Surrounding application UI masked | ❌ **No** — required |

---

## 8. ADDENDUM — final verification after OI-15/OI-17 corrections

Re-verified after the snapshot-naming fix (OI-15 §7) and Owl carousel pinning
(OI-17): the mask is present in both `capture-baseline.ts` and
`m1-screenshots.spec.ts`, identical selector and colour on both sides, and the
masked region reads back as pure `#FF00FF` in the current production-captured
baseline (`baseline/screenshots/video-guest-desktop.png`, pixel (300,420) =
`(255, 0, 255)`). `/video` and `/details` pass on desktop and tablet once
compared against the correctly-named baseline file — see M1 Gate Report §13.8
for full cross-viewport numbers. `maxDiffPixelRatio` remains unchanged at
`0.01` throughout.

---

*End of OI-16 Resolution Report*
