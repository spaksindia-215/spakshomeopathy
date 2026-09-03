# OI-17 RESOLUTION REPORT — Owl Carousel Autoplay Capture Nondeterminism

**Issue:** OI-17 (new) — `/details` screenshot intermittently differs by one carousel slide
**Status:** ⚠️ **PARTIALLY MITIGATED — residual flakiness documented, not eliminated**
**Date:** 2026-08-10/11
**Author:** Migration Implementer
**Authorization:** Discovered during OI-14/15/16 verification; classified per the
same evidence-driven method the owner specified for OI-15/OI-16, and documented
per the standing instruction: *"If fixing OI-13 [and related items] reveals
another distinct defect, stop and document it as a new OI rather than fixing
it opportunistically."*
**Scope:** Verification harness only. **Application NOT modified.**

---

## 1. HOW THIS WAS FOUND

While re-running the full 3-viewport Playwright regression after OI-14/15/16,
`/details` failed intermittently with a large (4–5%) pixel diff, even after
every other page reached stable parity. Investigated per the same method
required for OI-15/OI-16 rather than dismissed as more GT flakiness.

---

## 2. CLASSIFICATION

| Candidate | Verdict |
|---|---|
| Application markup/CSS | ❌ Ruled out — see §4 |
| Harness timing (arbitrary sleep) | ⚠️ Contributing factor, improved but not eliminated |
| **Third-party widget autoplay** | ✅ **Root cause** |

**This is the same class of issue as OI-15 (Google Translate) and OI-16
(YouTube chrome): a third-party-driven, capture-time-dependent visual state
that the application does not — and per contract F-23, must not — control.**

---

## 3. EVIDENCE

### 3.1 The carousel autoplays

`.recent-products__carousel` on `/details` is configured:

```
theme.js:420-433
  loop: true,
  autoplay: true,
  smartSpeed: 500,
  autoplayTimeout: 2000,
  autoplayHoverPause: true,
```

It advances one slide every 2000ms, indefinitely, on both production and the
Next.js app — this is `theme.js` executing unmodified (per OI-10's
interoperability design), so the behavior is faithfully reproduced.

### 3.2 First attempt: stopping via Owl's JS API — rejected, it throws

The first mitigation called Owl's own control API to force a specific slide:

```js
carousel.trigger('to.owl.carousel', 0);
```

This **threw inside the plugin** once autoplay had already ticked at least
once:

```
TypeError: Cannot read properties of undefined (reading 'start')
  at owl.carousel.min.js:2:7137
  at jquery.js:2:3856 (trigger dispatch)
```

This is a **preexisting Owl/jQuery interaction issue in the third-party
plugin itself** — not something introduced by this migration — and it is
consistent with why F-23 forbids reimplementing these widgets: their internal
state machines are not designed for external control after autoplay starts.
Because the call was wrapped in a `.catch()` (required so a missing
carousel doesn't fail pages that have none), the throw was silently absorbed,
meaning the pin **silently did nothing** on some runs. Recorded here so this
approach is not retried.

### 3.3 Second attempt: `stop.owl.autoplay` + hover — evidence

`autoplayHoverPause: true` is part of the carousel's **own** configuration
(theme.js:433) — the widget already pauses on mouse hover, by design. Using
`page.locator(...).hover()` immediately after `.owl-loaded` is therefore
ordinary user interaction the widget explicitly supports, not a call into Owl
internals, and it cannot throw.

Isolated verification (fresh browser context per run, hover immediately after
load):

```
PROD:  ["matrix(1,0,0,1,-1200,0)"] × 5 runs — identical
LOCAL: ["matrix(1,0,0,1,-1200,0)"] × 5 runs — identical
10/10 IDENTICAL across both sides
```

This is genuinely deterministic **in isolation**.

### 3.4 Residual nondeterminism in the full suite

Running the complete 9-page suite (not an isolated single-page run), `/details`
still shows the carousel landing on a different slide between the local
capture and the production capture — verified visually:

| | Content shown (first 6 items) |
|---|---|
| Expected (production capture) | Brain, Cancer, Children-Disease, Ear, Eye, Female |
| Actual (local, full-suite run) | Bone, Brain, Cancer, Children-Disease, Ear, Eye |

**One slide of offset.** Reproducible across desktop, tablet, and (compounded
with OI-15) mobile.

**Cause:** the hover-immediately-after-load approach is sensitive to exactly
*when* `.owl-loaded` fires relative to autoplay's first 2000ms tick. In an
isolated single-test run, page load is the dominant cost and hover lands
comfortably before the first tick on both sides symmetrically. In the full
9-test suite, browser/OS scheduling, prior-test state, and warm caches shift
that margin — sometimes past the first tick on one side but not the other,
landing the two captures on adjacent slides.

### 3.5 The application is unaffected — decisive check

```
PROD:  carousel item count=27  unique labels=15  page height=1881
LOCAL: carousel item count=27  unique labels=15  page height=1881
```

**Identical content, identical count, identical height.** The only variable is
*rotational position at the instant of capture* — exactly the same category of
"correct content, nondeterministic third-party presentation" already
established for OI-15 (Google Translate) and OI-16 (YouTube chrome).

---

## 4. WHY THIS IS NOT AN APPLICATION DEFECT

| Requirement | Status |
|---|---|
| Same carousel plugin, unmodified | ✅ `owl.carousel.min.js` untouched (OI-10) |
| Same autoplay configuration | ✅ `theme.js` untouched, same config both sides |
| Same slide content and count | ✅ §3.5 |
| Difference is WHEN captured, not WHAT is rendered | ✅ |

Per F-23, the carousel's behavior — including its autoplay timing — is not
ours to alter. A production page loaded at a different instant would show a
different slide too; screenshot comparison is inherently sensitive to this for
any autoplaying widget, on both the Laravel app and the migrated one alike.

---

## 5. MITIGATION APPLIED (not a full fix — see §6)

`tests/e2e/m1-screenshots.spec.ts` and `scripts/capture-baseline.ts` both:

1. Wait for `.owl-loaded` (Owl's own completion marker) before interacting.
2. `hover()` the carousel immediately — using the widget's own
   `autoplayHoverPause` feature, not its internal API.
3. Wait for the carousel's CSS `transform` to stop changing across 3
   consecutive animation frames, rather than a fixed sleep.

This **reduces** the failure rate substantially (from "every run" under the
old fixed-sleep harness to "sometimes, in a full suite run") but does **not**
eliminate it, per §3.4.

### 5.1 Why a stronger fix was not applied

Two theoretical stronger options were considered and **rejected**:

| Option | Why rejected |
|---|---|
| Force `to.owl.carousel(0)` regardless of the throw | Throws inside the plugin (§3.2); would require wrapping every capture in error-suppression around a **known-broken** third-party call — worse than the current approach, and closer to "modifying behavior to pass the test," which the owner explicitly forbade |
| Increase `maxDiffPixelRatio` for `/details` | Rejected per the same reasoning as OI-16 §3.1 — a page-level tolerance would also silently absorb unrelated regressions on that page |
| Disable Owl autoplay via a config patch | Would modify `theme.js`'s behavior — forbidden by F-23 and by the explicit instruction not to alter the embed/widget |

No further application or plugin-behavior change was made without approval,
consistent with the instruction to document rather than opportunistically fix.

---

## 6. REMAINING LIMITATION — OPEN

**`/details` screenshot comparison is flaky, not reliably green**, at all three
viewports, when run as part of the full suite. Isolated single-test runs of
`/details` are consistently stable (§3.3). This is a known limitation of
screenshot-testing any page with vendor-autoplaying content and is documented
here rather than silently worked around.

**Possible future approaches, NOT implemented pending owner decision:**

- Accept a small, `/details`-only, carousel-region-scoped mask (same pattern as
  OI-16), which would make the comparison ignore rotational position entirely
  while still asserting the carousel's size/position/surrounding layout.
- Re-run only the `/details` screenshot check with Playwright's built-in
  `toPass()` retry wrapper, scoped narrowly — **not** implemented here because
  the owner's instruction for OI-15 was explicit that retries must never turn
  a failure into a pass; the same reasoning was applied preemptively to OI-17
  without being asked, since it is the same class of instruction.
- Investigate whether `prefers-reduced-motion` or a similar accessibility
  media feature already pauses Owl in this theme (untested — would need
  verification it doesn't also change other behavior before use).

**This document exists so a future session does not re-diagnose `/details`
flakiness as an application regression** — the application is proven correct
in §3.5; only the capture harness's interaction with a third-party autoplay
timer is imperfect.

---

## 7. SCOPE COMPLIANCE

| Constraint | Status |
|---|---|
| No Milestone 2 / 3 work | ✅ |
| No CR-001 / CR-002 / settings system | ✅ |
| Business logic / auth / DB / Laravel source unmodified | ✅ |
| Application modified to ease the harness | ❌ **No** |
| Widget/plugin behavior altered | ❌ **No** — hover uses the widget's own documented feature |
| Arbitrary sleeps reintroduced | ❌ **No** |
| Retries used to mask failures | ❌ **No** |
| `LegacyScriptRunner.tsx` unmodified | ✅ |

---

## 8. ADDENDUM (2026-08-16) — DETERMINISM RE-INVESTIGATED PER OWNER REQUEST

**Owner instruction:** accept OI-17 as a third-party timing issue, but first
investigate whether the harness can reach a deterministic visual state using
only a standard, non-invasive browser interaction the plugin already supports
(e.g. its existing hover/pause behavior) — without changing application
behavior. If it cannot be made deterministic this way, leave OI-17 OPEN rather
than forcing a pass.

**This investigation was performed. It could not make the full-suite capture
deterministic. OI-17 remains OPEN**, now with substantially stronger evidence
for *why*.

### 8.1 What was investigated

Read Owl Carousel's own (unminified-equivalent) source directly rather than
inferring from black-box behavior:

- `AutoPlay.prototype.autoplay()` — clears any existing interval and arms a
  fresh `setInterval(..., autoplayTimeout)` (2000ms). Called from the
  `translated.owl.carousel refreshed.owl.carousel` event handlers — i.e. on
  every `refresh()`, including the one that runs during initial load.
- `refresh()` calls `this.trigger("refreshed")` (arming the timer) as its
  **last** synchronous statement, and only *after* `refresh()` returns does
  the caller add the `owl-loaded` class. So by the time `.owl-loaded` is
  observable, the timer is guaranteed already armed with a full 2000ms before
  its first tick — confirming there is no race in *whether* the interval
  exists at that point.
- `mouseover.owl.autoplay` → `pause()` → `clearInterval(this.interval)` when
  `autoplayHoverPause` is true (it is, `theme.js:433`). This is a synchronous,
  side-effect-free call — not a fragile internal API, unlike `to.owl.carousel`
  (§3.2, confirmed still throws and was **not** retried).

This confirmed hover-based pausing is architecturally sound, not merely an
observed correlation — which made the residual flakiness worth pursuing
further rather than accepting on faith.

### 8.2 Every isolated reproduction was deterministic

Across this re-investigation, every scripted reproduction outside the real
capture pipeline was **100% stable**:

| Scenario | Runs | Result |
|---|---|---|
| Fresh page load at desktop viewport only, hover once | 10 (5 local + 5 prod) | **10/10 identical** (`matrix(...,-1200,0)`, items `Heart, Infectio, Life Sty, Liver, Male, Mouth & ...`) |
| Same, but with 4 background pages loading concurrently (simulating suite load) | 6 (3 local + 3 prod) | **6/6 identical**, including one run where the page took 16.6s to load — autoplay would have ticked 8× if the pause had failed, and it still hadn't |
| Full mobile→tablet→desktop resize sequence, hover at each viewport | 4 local + 6 prod (sequential) | **Deterministic within each environment** — local always `Liver, Male, Mouth&To...`; prod converges to the same set after the first viewport |
| Fresh desktop-only load, extra 3s wait + real `image.decode()` after hover-pin | 1 (decode measured at 15ms) | **No drift** — content identical before and after |

None of these reproduced the failure. This ruled out my working hypotheses in
turn: raw scheduling delay, concurrent browser load, and image-decode
duration were each tested directly and found not responsible.

### 8.3 The actual production script IS measurably nondeterministic

Running `scripts/capture-baseline.ts` itself — unmodified, exactly as used for
real baselines — six consecutive times for `/details` produced **four
different carousel positions**:

| Run | First visible item |
|---|---|
| 1, 2, 5, 6 | `Brain` |
| 3 | `Cancer` |
| 4 | `Male` (a full carousel loop away from the others) |

This is the first time in this investigation the nondeterminism was caught
directly in the real pipeline rather than inferred. It confirms the owner's
original classification was correct: **something in the actual capture
path — not reproducible in any hand-built isolation of its individual
steps — causes the hover-pause to occasionally not hold.** Suspected
contributors (screen-recording via `fullPage`'s scroll-and-stitch process
interacting with a `position:fixed`-adjacent hover target, or scheduling
jitter specific to the full multi-viewport + mask + decode + screenshot
sequence) were examined but not conclusively isolated — the failure did not
reproduce reliably enough, even in the real script, to instrument further
within this session (6 runs at ~2 min each; a statistically confident
isolation would need many more).

### 8.4 Conclusion — OI-17 remains OPEN, per instruction

No deterministic state was found using a standard, non-invasive, plugin-
supported interaction. Per the owner's explicit instruction, **this is left
OPEN rather than forced to pass**:

- ❌ Owl's internal API (`to.owl.carousel`) — throws (§3.2, unchanged)
- ✅ `autoplayHoverPause` via `.hover()` — architecturally correct, and
  reliable in every isolated test, but **not reliable in the real capture
  pipeline** (§8.3)
- ❌ No tolerance was raised, no mask was added to `/details`, no retry was
  introduced, and no application/plugin file was touched during this
  investigation

**Nothing was changed in this addendum.** `capture-baseline.ts` and
`m1-screenshots.spec.ts` are unmodified from the state described in §5. This
addendum only adds evidence; the mitigation and its limitation stand as
previously documented.

---

*End of OI-17 Resolution Report*
