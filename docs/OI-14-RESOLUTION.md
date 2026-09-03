# OI-14 RESOLUTION REPORT — Page-Body JSX Inter-Element Whitespace

**Issue:** OI-14 — `/about` appointment buttons rendered without production's inter-element space
**Status:** ✅ **RESOLVED**
**Date:** 2026-08-10
**Author:** Migration Implementer
**Authorization:** Owner — "Proceed with OI-14, OI-15, and OI-16", 2026-08-10
**Scope:** OI-14 only. No new functionality. No business logic, auth, DB, or Laravel source touched.

---

## 1. ROOT CAUSE

Identical in class to OI-13, in a different location: **page body** rather than
shared header/footer.

The Blade source separates the two appointment buttons with a **newline**:

```html
<a href="#" class="btn btn-success"> Book a Video Appointment </a>
<a href="...consultancy" class="btn btn-info"> Book an In-Clinic Appointment</a>
```

HTML collapses that newline into **one rendered space**. `.btn` is
`display:inline-block` (verified via `getComputedStyle`), so the space is
**layout**. JSX discards whitespace containing a newline, so it was dropped.

---

## 2. EVIDENCE

### 2.1 Raw HTML comparison

| Source | Markup between the buttons |
|---|---|
| Production | `</a>\n<a href=...` — newline present |
| Next.js (before) | `</a><a href=...` — **no separator** |

### 2.2 Computed layout — JavaScript **disabled** and **enabled**

```
JS DISABLED   PROD  display=inline-block  xs=[492,708]  gap=3
              LOCAL display=inline-block  xs=[494,707]  gap=0    ← defect

JS ENABLED    PROD  gap=3
              LOCAL gap=0                                        ← identical
```

The discrepancy is **identical with JavaScript disabled**, proving it is
server-rendered markup and **independent of OI-10** (React hydration, jQuery,
Owl, WOW, Magnific, theme.js).

### 2.3 Systematic scan — the important finding

Rather than fix only the reported symptom, I wrote a scanner comparing **every
inline-level sibling pair** on all 9 migrated pages, production vs local, with
JavaScript disabled. It found the reported defect **and four more**:

| Page | Mismatches found | Element |
|---|---|---|
| `/about` | 1 | `DIV.jumbotron > A[0]` — P=3 L=0 |
| **`/details`** | **4** | `DIV.star-box > A[0..3]` — P=3 L=0 each |
| contact, terms, privacy-policy, return-policy, mother-tincture, videos, video | 0 | — |

The `/details` star rating had the same defect and was **not** part of the
original OI-14 report. Blade emits:

```html
<a href="#" class="fa fa-star"></a>
<!--
--><a href="#" class="fa fa-star"></a>
```

The HTML comment renders nothing (contract §12.4), but the **newline before it**
renders as one space, and `.fa-star` anchors are inline — so each of the four
gaps is layout.

---

## 3. FILES CHANGED

| File | Change |
|---|---|
| `src/app/about/page.tsx` | 1 explicit `{' '}` between the two `.btn` anchors |
| `src/app/details/page.tsx` | 4 explicit `{' '}` between the five `.fa-star` anchors |

No CSS. No margins. No layout restructuring. No component replaced.

---

## 4. EXACT CORRECTION

```jsx
</a>{' '}
<a href="...">
```

Reproduces exactly the space the browser renders from the Blade newline —
adding no spacing of its own. This is contract **NN-5** fidelity (rendered DOM
must match), not a styling decision.

---

## 5. BEFORE / AFTER

Inline-pair scan, all 9 pages, JavaScript disabled:

| Stage | Total mismatches |
|---|---|
| Before | **5** (1 × `/about`, 4 × `/details`) |
| After | **0** |

```
/about            14 prod pairs, 14 local pairs, 0 MISMATCH
/details          16 prod pairs, 16 local pairs, 0 MISMATCH
/contact          17 / 17, 0    /terms            13 / 13, 0
/privacy-policy   13 / 13, 0    /return-policy    13 / 13, 0
/mother-tincture  12 / 12, 0    /videos           12 / 12, 0
/video            12 / 12, 0
```

Every inline-level sibling gap on every migrated page now matches production.

---

## 6. VERIFICATION

| Check | Result |
|---|---|
| Inline-gap scan (JS disabled), 9 pages | ✅ **0 mismatches** |
| Inline-gap scan (JS enabled) | ✅ consistent |
| `npm run typecheck` | ✅ PASS |
| `npm run lint` | ✅ PASS |
| `npm run format:check` | ✅ PASS |
| `npm run test` | ✅ PASS 7/7 |
| `npm run build` | ✅ clean — pages remain `○ (Static)` |
| Asset integrity | ✅ 2,860 / 2,860 |
| OI-10 (widgets) | ✅ not regressed |
| OI-13 (header/footer gaps) | ✅ not regressed |

Full cross-viewport results are consolidated in the M1 Gate Report §13.8.

---

## 7. REMAINING LIMITATIONS

None specific to OI-14. The scanner covers inline-level **sibling** pairs; it
would not detect a whitespace difference inside a text run that does not change
element geometry. No such case was observed, and page heights match production
exactly on all 9 pages.

---

## 8. SCOPE COMPLIANCE

| Constraint | Status |
|---|---|
| No Milestone 2 / 3 work | ✅ |
| No CR-001 / CR-002 / settings system | ✅ |
| Business logic unmodified | ✅ |
| Authentication unmodified | ✅ |
| Database unmodified | ✅ |
| Laravel source unmodified | ✅ |
| `LegacyScriptRunner.tsx` unmodified | ✅ |
| No arbitrary CSS margins introduced | ✅ |
| No layout redesign | ✅ |

**New issues discovered:** none. The four extra `/details` instances are the
**same defect class as OI-14** in the same sweep, not a distinct issue, so they
were fixed under this item rather than deferred — consistent with OI-14's stated
objective ("investigate and resolve the whitespace/layout discrepancy" using the
OI-13 method). No unrelated issue was fixed opportunistically.

---

*End of OI-14 Resolution Report*
