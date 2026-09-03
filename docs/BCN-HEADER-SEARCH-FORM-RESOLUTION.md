# BCN — Header Search Form: Investigation and Resolution

**Status:** ✅ **RESOLVED — SOURCE IS AUTHORITATIVE, WITH A CORRECTION TO THE PRIOR FINDING**
**Date:** 2026-08-16
**Supersedes:** `docs/M3-APPLICATION-MAPPING.md` §6.3's "3-way disagreement" framing —
that framing is **incorrect** and is corrected here, not merely re-investigated.
**Triggering instruction:** owner review of M3 Phase 1, requiring investigation before
any implementation proceeds

---

## 0. HEADLINE FINDING — READ THIS FIRST

**There is no three-way conflict.** The original finding in
`docs/M3-APPLICATION-MAPPING.md` §6.3 was **a misreading of the production capture
evidence**, caught and corrected during this investigation. The actual, re-verified
picture is a **two-way disagreement**, and both independent sources agree with each
other against the third:

| Source | Search form state |
|---|---|
| `public_html/resources/views/inc/header.blade.php` (the verified fresh export) | **Commented out** |
| **Actual live production**, captured 2026-08-01, `baseline/raw-html/home-root.guest.raw.html` | **Commented out** — re-verified this session, byte-for-byte, full context |
| `spakshomeopathy.com/resources/views/inc/header.blade.php` (the old, stale local backup) | **Live/uncommented** — the outlier |

**`public_html/` and actual live production agree with each other.** The stale local
backup is the one that disagrees with both. This is the opposite of what
`M3-APPLICATION-MAPPING.md` §6.3 concluded, and that error is owned and corrected
below, not quietly dropped.

**Classification: SOURCE IS AUTHORITATIVE.** `public_html/` is confirmed correct —
it already matches what production actually serves.

---

## 1. WHAT WENT WRONG IN THE ORIGINAL FINDING — DISCLOSED, NOT HIDDEN

`M3-APPLICATION-MAPPING.md` §6.3 quoted the production capture as showing the search
form "**Live** — verified `<form name="searchfrm" ... >` renders uncommented at line
217." That citation looked at line 217 (the `<form>` tag itself) in isolation. Line
217 does not itself contain a `<!--` token — but it is the **second line of a
multi-line HTML comment that opened on line 216** (`<!-- <div class="wrap">`) and does
not close until several lines later (`</div>-->`). Checking one line in isolation,
without confirming whether it sits inside an already-open comment block, produced a
false "uncommented" reading.

**This was caught during this investigation** by re-reading the full surrounding
region (lines 205–240) rather than the single previously-cited line, and is
disclosed here explicitly — per the same evidentiary standard this project applies to
every other finding (contract §7.4: "fidelity is proven, not asserted"), an error in a
prior finding gets the same treatment as an error in the source: found, evidenced, and
corrected on the record, not silently patched over.

**Independent verification, this session (full transcript below in §2–§5):** the
corrected reading — search form commented out in the actual production capture — was
re-derived from scratch, cross-checked against three independent lines of evidence
(the raw capture bytes, the production server's own compiled-view cache with embedded
filesystem paths, and file-mtime chronology), not merely re-asserted.

---

## 2. INVESTIGATION METHOD — WHAT WAS ACTUALLY CHECKED

Per the owner's instruction, all plausible mechanisms were investigated, not assumed:

| Mechanism | Investigated? | Finding |
|---|---|---|
| Blade includes / alternate header files | ✅ | Exactly one `header.blade.php` exists for this project (`public_html/resources/views/inc/header.blade.php`). No alternate/route-specific header file exists — confirmed via `find . -iname "header.blade.php"` across the whole `public_html/` tree; the only other matches belong to the three unrelated sibling projects (`babasahebsamaj/`, `meenaparivaar/`, `spakseducation/`) or are Laravel's own stock mail-template stubs, none of which this project's routes reference |
| Compiled/cached Blade views | ✅ — **this is where the real evidence was found** | `storage/framework/views/` contains **stale, uncleared compiled-view cache going back months**, including compiles from a **completely different production hosting account** and **at least one developer's local Windows XAMPP machine** — see §3 |
| Deployment differences / filesystem drift | ✅ | The compiled-cache path comments (`/**PATH ... ENDPATH**/`, a standard Laravel compiler artifact) directly reveal **two different production hosting-account paths** have served this codebase over time — see §3 |
| Deployment symlinks/releases | ✅ | `public_html/` is a plain directory, not a symlink (`readlink -f` returns itself); no release-based deployment structure (e.g. Capistrano-style `releases/current`) is present |
| Generated/cached assets | ✅ | Checked — not relevant to this specific finding (the discrepancy is in compiled *view* PHP, not a static asset) |
| Runtime modifications / JS insertion | ✅ | `public/assets/js/theme.js` and all other shipped JS were checked for any reference to `searchfrm` or `.wrap` — **zero matches**. No script inserts, removes, or toggles this markup at runtime |
| Route-specific header variants | ✅ | Ruled out — only one `header.blade.php` exists, included identically by every public page via `@include('inc.header')` |
| Production filesystem differences | ✅ | This **is** the finding — see §3 |

---

## 3. THE EVIDENCE — COMPILED-VIEW CACHE AS A FORENSIC RECORD

Laravel compiles each Blade template into a plain-PHP file under
`storage/framework/views/`, named by a hash, and **embeds a comment recording the
exact absolute filesystem path it was compiled from**:
`<?php /**PATH /absolute/source/path ENDPATH**/ ?>`. This cache is normally
invisible/disposable — but because this export apparently bundled the *entire*
application directory (including `storage/`, which should never ship in a clean
export), it inadvertently preserved a forensic record of **every environment that has
ever compiled this codebase's views**, each stamped with a real filesystem path and a
real file-modification timestamp.

A full census of every compiled view's embedded path (`grep -h "PATH " storage/framework/views/*.php`) found compiled artifacts from **at least six distinct environments**, spanning what are clearly **multiple client projects built from the same
original template** (confirming, independently, the "zeintext"/"green-gifts" template-
origin findings already made in earlier M2/M3 documents):

| Path prefix found in compiled cache | What it is |
|---|---|
| `/home/vvx6wz93i9zn/public_html/spakshomeopathy.com/...` | An **older** Spaks Homeopathy production hosting account |
| `/home/u111051584/domains/spakshomeopathy.com/public_html/...` | A **different, currently-active** Spaks Homeopathy production hosting account (cPanel addon-domain path structure) |
| `C:\xampp\htdocs\newspaks\...` | A developer's **local Windows XAMPP** machine |
| `/home/sspq17ymfxcu/public_html/zeintext.com/...`, `E:\xampp\htdocs\zeintext.com\...` | The unrelated `zeintext.com` project (the original template vendor, already known from earlier findings) — production and local-dev copies |
| `/home/sspq17ymfxcu/public_html/green-gifts.co.in/...`, `D:\xampp\htdocs\green-gifts...`, `F:\xampp\htdocs\green-gifts.co.in\...` | The unrelated `green-gifts.co.in` project — production and multiple local-dev copies |

**This directory is a leftover artifact of an export/copy process, not a clean
production snapshot.** It should not have been included in a "fresh production
export" and is itself informative evidence, not something to clean up or ignore for
this investigation.

### 3.1 Isolating the two `spakshomeopathy.com`-relevant compiles of `header.blade.php`

Three compiled copies of `header.blade.php` exist in this cache. Their embedded
paths and mtimes:

| Compiled file | Embedded source path | Compile mtime | Search form state |
|---|---|---|---|
| `b83b1f0dd9380c15d8590e352be79b6fc973143f.php` | `C:\xampp\htdocs\newspaks\resources\views/inc/header.blade.php` | 2026-01-07 11:18:18 | **No search-form markup exists in this version at all** — this is an *older structural revision* of the header, predating even the search form's introduction (different topbar markup entirely, no Google Translate widget) |
| `72bfc837eda193ab8bc0d5968f8c7d8a688a76cb.php` | `/home/vvx6wz93i9zn/public_html/spakshomeopathy.com/resources/views/inc/header.blade.php` | 2026-01-07 11:18:13 | **Live/uncommented** |
| `a9d7956cb9d8395a5ca5244c7639a30baee19750.php` | `/home/u111051584/domains/spakshomeopathy.com/public_html/resources/views/inc/header.blade.php` | 2026-03-05 12:08:29 | **Commented out** |

**Chronology, reconstructed from these three data points plus the current source
file's own mtime:**

1. **Earliest** (structure predates the search form entirely) — a XAMPP local-dev
   compile, `newspaks` project folder, no date reliably orderable against the others
   beyond "older structurally."
2. **2026-01-07** — the `vvx6wz93i9zn` hosting account compiles a version **with the
   search form live**.
3. **2026-03-05** — a **different** hosting account, `u111051584`, compiles a version
   **with the search form commented out**. The current `header.blade.php` source
   file's own mtime (`2026-03-05 12:08:27`, two seconds before this compile) confirms
   this compile was produced from **exactly the source that is still in the export
   today** — nothing has changed since.
4. **`u111051584`'s compiled-view activity continues through 2026-08-16** (today) —
   confirmed via a broader scan of that account's other cached views, not just the
   header — while **`vvx6wz93i9zn`'s entire footprint in this cache is confined to a
   few minutes on 2026-01-07** (consistent with a one-time bulk copy/export event, not
   ongoing traffic).

**Conclusion: `u111051584` is the currently-active production hosting account.** The
`vvx6wz93i9zn` account's compiled cache is a snapshot from an account that was live
only briefly around January 7 — most plausibly the *prior* hosting account, before a
migration to the current one, or a staging/testing account used briefly during that
period. Either way, its evidence describes a state that is **not what has been live
since at least March 5, 2026.**

---

## 4. RECONCILING AGAINST THE ACTUAL PRODUCTION HTTP CAPTURE

Independent of the compiled-cache forensics above, the M0 baseline
(`spakshomeopathy-next/baseline/raw-html/home-root.guest.raw.html`, captured
**2026-08-01** via a direct, no-JS-execution HTTP fetch of `https://spakshomeopathy.com/`)
is a **third, fully independent data source** — not filesystem evidence at all, but an
actual observed HTTP response.

**Re-read in full this session (lines 205–240, not just the single line the original
finding cited):**

```
<div class="main-navigation">
<div class="row">
 <!-- <div class="wrap">
    <form name="searchfrm" id="searchfrm" method="POST" action="https://spakshomeopathy.com/search-products">
        <input type="hidden" name="_token" value="8AiSbL9OTK7pCuVejJbUCdDFFFGi8j5R5xT1LPo5">
     ...
</form>
</div>-->
```

**The search form is inside an HTML comment block that opens on the line before the
`<form>` tag and does not close until after `</form>`.** The `<form>` tag itself, read
in isolation, does not visually announce that it's commented — which is exactly how
the original finding was misled. Read in full context, **the actual production HTTP
response on 2026-08-01 already had the search form commented out** — five months
after the March 5 source edit that `public_html/` also reflects.

**This is fully consistent with §3's chronology**, not a separate mystery: the
production site captured on August 1 was being served by the `u111051584` account
(the one still actively compiling views through today), whose March 5 header state —
search form commented out — is exactly what `public_html/`'s current source also
shows.

---

## 5. WHY THE "MY ACCOUNT" DROPDOWN NEVER DISAGREED

For completeness: the My-Account/Register-Login dropdown block's comment-state was
**never** part of the disagreement — all three sources (`public_html/`, the stale
backup, and the production capture) show it commented out identically. This was
correctly stated in the original finding and required no correction. Only the search
form's comment-state was misread.

---

## 6. CLASSIFICATION

Per the categories the owner specified:

- ☑ **SOURCE IS AUTHORITATIVE** — `public_html/` is confirmed correct. It matches
  actual, current, live production exactly on this point.
- ☐ LIVE RUNTIME IS AUTHORITATIVE — not applicable in the sense of overriding
  `public_html/`; runtime *confirms* the source, it does not contradict it
- ☐ DEPLOYMENT DRIFT — not the explanation for the *current* discrepancy (source vs.
  stale backup), though deployment history (the `vvx6wz93i9zn`→`u111051584` hosting
  migration) **is** the explanation for *why the stale backup itself is wrong* — it
  most plausibly predates the March 5 edit, or was taken from the older
  `vvx6wz93i9zn` account's state before the edit propagated
- ☑ **CACHE/GENERATED ARTIFACT** — secondary classification: the *investigation
  method* that resolved this relied on a cache/generated artifact (`storage/framework/views/`)
  that should not have shipped in a clean export, but which — in this case — helped
  resolve the question rather than cause it
- ☐ UNRESOLVED / REQUIRES OWNER DECISION — **not** the outcome; this is resolved with
  high confidence based on three independent, mutually-corroborating lines of evidence
  (compiled-cache path/chronology forensics, the current source file's own mtime, and
  a direct re-read of the actual production HTTP capture)

---

## 7. WHAT THIS MEANS FOR M1's ALREADY-BUILT HEADER

`docs/M3-APPLICATION-MAPPING.md` §6.3 flagged that this finding "may retroactively
affect M1's already-completed header port." **That concern is now resolved, not
escalated further:**

`GATE-REPORT-M1.md` §9.3 already documents that M1's `PublicHeader.tsx` was built
**from the same August 1 production capture** re-examined in §4 above, and already
states the search form was ported as commented out ("both blocks rendered as JSX
comments"). **M1's header port is correct and requires no change.** The apparent
3-way conflict this investigation was asked to resolve never actually threatened M1's
work — it was an artifact of a misreading in a *later* document
(`M3-APPLICATION-MAPPING.md`, written after M1), not a defect in M1 itself.

---

## 8. CORRECTIVE ACTION TAKEN ON THE ORIGINAL FINDING

`docs/M3-APPLICATION-MAPPING.md` §6.3 is **not deleted or silently edited** (this
project's append-only discipline for prior work applies to project analysis, not only
gate reports) — instead, this document supersedes it, and a short append-only
correction pointer has been added to that section directing readers here. See the
diff applied to that file, immediately following this document's creation.

---

## 9. WHAT WAS NOT DONE

- No production source was modified — `public_html/` was read-only throughout
- No Next.js file was modified
- No MongoDB connection attempted
- No implementation of any kind occurred
- `babasahebsamaj/`, `meenaparivaar/`, `spakseducation/` were referenced only to the
  extent their compiled-cache fingerprints appeared in the forensic census (§3) —
  confirming they are unrelated projects, consistent with prior findings; no other
  content from them was read or acted upon

---

## 10. RECOMMENDATION FOR FUTURE VERIFICATION WORK

The `storage/framework/views/` compiled-cache census technique used here (extracting
embedded `/**PATH ... ENDPATH**/` comments) is a **generally useful forensic method**
for this project whenever a source-vs-production discrepancy is suspected in the
future — it directly reveals filesystem paths and compile timestamps that plain
Blade-source reading cannot. Recorded here so a future session doesn't have to
rediscover this technique from scratch.

---

*This document resolves the header search-form investigation. No further action is
authorized by this document alone — M3 implementation remains NOT AUTHORIZED per the
owner's standing instruction, unaffected by this resolution.*
