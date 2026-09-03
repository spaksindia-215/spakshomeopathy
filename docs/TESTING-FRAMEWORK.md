# Testing Framework — Configuration and Usage

**Status:** Configured in Milestone 0. **No migration tests exist yet, by instruction.**
**Governs:** MIGRATION-CONTRACT.md Part 5 (Testing Contract)

---

## 1. Two frameworks, two jobs

| Framework | Covers | Why |
|---|---|---|
| **Vitest** | V-05 DB writes, V-06 DB reads, V-07 forms, V-08 validation, V-11 AJAX/API | Fast, no browser, direct function/query calls |
| **Playwright** | V-01 UI parity, V-02 responsive, V-03 route parity, V-04 authentication, V-12 error handling, V-13 console errors, V-14 network requests | Requires a real browser: DOM, rendering, console, network |

Categories V-09 (emails) and V-10 (uploads) are covered by Vitest plus manual verification, since both touch external systems.

---

## 2. The two modes — never confuse them

Playwright is used in two **strictly separate** modes. Mixing them corrupts the reference set.

### Mode 1 — CAPTURE (Milestone 0)

```
npm run baseline:capture
```

- **Reads:** the live **Laravel** site (`https://spakshomeopathy.com`)
- **Writes:** `baseline/`
- **Asserts:** nothing
- **Frequency:** once in M0; re-run only if the Laravel app changes

A hard guard in `scripts/capture-baseline.ts` **refuses to run** against any host other than `spakshomeopathy.com`. Pointing capture at the Next.js app would overwrite the baseline with the thing it is meant to check — contract T-1: *if the baseline is wrong, everything downstream is wrong.*

### Mode 2 — VERIFY (Milestone 1 onward)

```
npm run test:e2e
```

- **Reads:** the **Next.js** app (`BASE_URL`, default `http://localhost:3000`)
- **Compares against:** `baseline/`
- **Asserts:** parity
- **Frequency:** every milestone gate, plus during development

**Verification must never write to `baseline/`.**

---

## 3. What the baseline contains

Per route × role:

| Artifact | Category | Purpose |
|---|---|---|
| `html/<id>.<role>.html` | V-01 | Raw HTML as served |
| `html/<id>.<role>.normalized.html` | V-01 | Permitted variance stripped — the diff target |
| `screenshots/<id>.<role>.{mobile,tablet,desktop}.png` | V-02 | Full-page screenshots |
| `meta/<id>.<role>.meta.json` | V-03 | Status, final URL, redirect flag, headers |
| `console/<id>.<role>.console.json` | V-13 | Every console message |
| `network/<id>.<role>.network.json` | V-14 | Every request with status |

Plus `baseline/manifest.json` — the index, with SHA-256 of each captured HTML document and a per-route capture/skip record.

### Viewports

| Name | Size | Contract |
|---|---|---|
| mobile | 320 × 640 | V-02 mandatory |
| tablet | 768 × 1024 | V-02 mandatory |
| desktop | 1440 × 900 | V-02 mandatory |

`playwright.config.ts` additionally defines `mobileLarge` (375), `laptop` (1024), and `desktopWide` (1920) for the blueprint §24.9 key-page set, used at Milestone 13.

---

## 4. Normalization — what may differ

Contract §7.2 permits exactly this variance. `normalizeHtml()` in `scripts/capture-baseline.ts` strips it before diffing:

| Variance | Handling |
|---|---|
| CSRF tokens (`_token`, `csrf-token` meta) | → `__CSRF_TOKEN__` |
| Session cookies (`laravel_session`, `XSRF-TOKEN`) | → `__SESSION__` / `__XSRF__` |
| Asset cache-busting query strings | → `__TS__` |
| Absolute datetimes | → `__DATETIME__` |
| Line endings | CRLF → LF |

**Everything else is a defect.** Note that whitespace is deliberately **not** collapsed — whitespace can be structurally meaningful in the original markup, and collapsing it would hide real differences.

Two further permitted variances apply only to **newly created records** and are handled per-test rather than globally: `str_random(5)` slug suffixes (blueprint §7.8) and `rand()` order-id components (§7.5).

---

## 5. Determinism

| Setting | Value | Why |
|---|---|---|
| `retries` | **0** | Contract T-2: never retry a parity failure into a pass. A flaky diff is itself a finding. |
| `workers` | 1 | Serial execution; avoids session interference against a shared backend |
| `timezoneId` | `Asia/Kolkata` | The Laravel app renders dates server-side; client TZ must not introduce drift |
| `locale` | `en-US` | Stable date/number formatting |
| `animations` | disabled | Screenshot stability |
| `maxDiffPixelRatio` | 0.01 | Absorbs font antialiasing without masking layout drift |

---

## 6. Authentication fixtures (Milestone 4)

Roles come from Playwright `storageState`, captured once per role:

```
guest  → no storage state
buyer  → utype=3, status=1
admin  → utype=1, status=1
```

Blueprint §5.2 documents the `backuser` hidden field that gates which form each role may use: the public form sends `seller_buyer`, the admin form sends `admin`. **An admin submitting the public form is authenticated then immediately logged out** — V-04 must test all six role×form combinations, including that forced logout (contract P-12).

---

## 7. Regression suite — asserting failure

`tests/regression/` is unusual: it asserts that things **stay broken**.

Contract §9.2 lists 17 BROKEN items (B-01…B-17) and §9.4 lists 18 Preserved Defects (P-01…P-18). Per contract **T-6 and G-8**:

> A previously broken item that now works is a **CONTRACT VIOLATION**, not a success.

Already confirmed in the M0 capture: `/order-placed` returns **HTTP 500** in production (B-17). The regression test must assert 500, not 200.

---

## 8. Commands

| Command | Mode | Target |
|---|---|---|
| `npm run baseline:capture` | Capture | Live Laravel |
| `npm run baseline:db` | Capture | Production DB (D-09) |
| `npm run test:e2e` | Verify | Next.js |
| `npm run test:e2e:ui` | Verify (interactive) | Next.js |
| `npm run test` | Unit | — |
| `npm run assets:verify` | Integrity | `public/` |
| `npm run verify` | typecheck + lint + format + unit | — |

---

## 9. Browsers

| Browser | Version | Status |
|---|---|---|
| Chromium | 151.0.7922.34 (Playwright build 1228) | Installed — primary |
| Firefox | 153.0 (Playwright build 1538) | Installed — Milestone 13 cross-browser |

**Playwright 1.62.1.** Version 1.57 was tried first and **does not support Ubuntu 26.04** (`Playwright does not support chromium on ubuntu26.04-x64`); 1.62.1 resolves it. WebKit is not installed; Safari coverage at Milestone 13 requires either a WebKit install or real-device testing.

---

## 10. Milestone 0 boundary

Milestone 0 delivers **framework configuration and the captured baseline only**.

Created: `playwright.config.ts`, `scripts/capture-baseline.ts`, `scripts/routes.ts`, `scripts/capture-db-baseline.ts`, and this document.

**No test asserts anything about the Next.js application**, because no Next.js application behavior exists yet. `tests/e2e/` does not exist; it is created in Milestone 1.
