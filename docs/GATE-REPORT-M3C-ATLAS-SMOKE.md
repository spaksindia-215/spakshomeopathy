# MILESTONE GATE REPORT — M3-C ATLAS SMOKE TEST

**Milestone:** M3-C follow-on (Atlas connection + smoke verification only,
per owner authorization "M3-C ATLAS CONNECTION + SMOKE TEST")
**Period:** 2026-08-21
**Author:** Migration Implementer
**Report date:** 2026-08-21
**Contract version:** 1.0

---

## 0. CONTRACT ACKNOWLEDGEMENT

- [x] I have read `MIGRATION-CONTRACT.md` in full (carried forward from prior phases)
- [x] I have read `docs/GATE-REPORT-M3C.md` (2026-08-16 — the prior M3-C
      phase, which explicitly recorded that no non-production MongoDB
      target existed at that time and no connection was attempted)
- [x] I have read `docs/M3C-MONGODB-INTEGRATION.md` and `docs/MONGODB-SETUP.md`
      before writing anything
- [x] I confirm no undocumented deviation was introduced
- [x] I confirm neither `src/lib/mongodb/client.ts` nor
      `src/lib/mongodb/environmentGuard.ts` was opened for editing at any
      point this phase
- [x] I confirm no Laravel source was modified
- [x] I confirm no migration, API, authentication, checkout, or admin CRUD
      work was started
- [x] I confirm the MongoDB URI was never printed, logged, echoed, or
      written to any file other than the pre-existing `.env.local`
      (which I did not modify)

---

## 1. OBJECTIVE

Owner-authorized scope: establish and verify a safe, non-production
MongoDB Atlas connection using the **existing** M3-A/M3-C safety
architecture exactly as implemented, then run the smallest possible
read-only smoke test. Explicitly not authorized: full migration, API
wiring, authentication, checkout, or admin CRUD.

**Achieved: Fully, for the read-only scope authorized (Steps 1–4).**
The first attempt (2026-08-21, morning) failed at the TLS layer,
diagnosed as an Atlas Network Access (IP allowlist) rejection — see §4a
below for that original diagnosis, retained for the record. On re-check
later the same day, the connection **succeeded**: both guards passed,
the driver connected, the ping succeeded, database identity was
confirmed as `spaks_dev`, and a real repository (`EnquiryRepository`)
was constructed against the live `Db` handle and performed a read-only
`find({})` with zero errors. Step 5 (optional controlled write test) was
evaluated and **deliberately skipped** — no existing isolated
write-smoke-test mechanism was found in the project, and the task's own
instruction is to skip rather than invent one in that situation.

---

## 2. ENVIRONMENT CONFIGURATION

**Source of the credential:** the owner confirmed explicitly, in this
conversation, that the MongoDB URI already present in the project's
`.env.local` (present since 2026-08-20, prior to this phase) is the
real, current, non-production Atlas URI to use. No new value was
supplied or written; the file was not modified by this phase in any way.

Sanitized values only:

| Variable | Value | Source |
|---|---|---|
| `MONGODB_ENV` | `development` | Pre-existing in `.env.local`, confirmed matches owner's Step 1 spec |
| `MONGODB_DB_NAME` | `spaks_dev` | Pre-existing, confirmed matches |
| `MONGODB_ALLOW_PRODUCTION` | `false` | Pre-existing, confirmed matches |
| `MONGODB_URI` host (redacted, as printed by the existing tool) | `mongodb+srv://<redacted>@spakshomeopathy.wc77zvf.mongodb.net/?appName=spaksHomeopathy` | Pre-existing. Never printed in full; only the tool's own built-in redaction output is reproduced here |

No credential (username, password, or full URI) appears anywhere in
this report, in any source file, or in any log this phase produced.

---

## 3. SAFETY GUARD RESULT

**Classification: VERIFIED AGAINST REAL MONGODB ATLAS** (the guard logic
ran against the real configured target, not a fixture)

Both independent guards ran, in the existing order, unmodified:

1. **`assertNonProductionTarget()`** (`environmentGuard.ts`, M3-C guard —
   inspects the URI/db-name content itself, independent of what
   `MONGODB_ENV` claims) — **PASSED.** Database positively identified as
   `spaks_dev`; host does not match any production-like pattern.
2. **`getDb()`**'s own guard (`client.ts`, M3-A guard — blocks
   `MONGODB_ENV=production` without the separate
   `MONGODB_ALLOW_PRODUCTION=true` flag) — **not triggered**, correctly,
   since `MONGODB_ENV=development`.

Neither guard was edited, weakened, or bypassed. Both ran exactly as
designed and both correctly allowed a non-production attempt to proceed.

---

## 4. ATLAS CONNECTION RESULT

**Classification: VERIFIED AGAINST REAL MONGODB ATLAS**

**Result (re-check, current): SUCCESS.** `npm run mongodb:check` output
(full, unmodified):

```
MongoDB environment: development
Database: spaks_dev
Target host (redacted): mongodb+srv://<redacted>@spakshomeopathy.wc77zvf.mongodb.net/?appName=spaksHomeopathy
Production guard: PASSED
Connection: SUCCESS
Ping: SUCCESS

MONGODB CONNECTION CHECK: ALL CHECKS PASSED
```

Exit code: 0.

Between the original attempt and this re-check, no code changed in
`client.ts`, `environmentGuard.ts`, or `.env.local` — the only variable
that changed was network reachability, consistent with the original
diagnosis (an Atlas-side allowlist/network condition, not an application
defect).

### 4a. Original failed attempt (2026-08-21, earlier the same day) — retained for the record

**Result: FAILED.**

```
MongoDB environment: development
Database: spaks_dev
Target host (redacted): mongodb+srv://<redacted>@spakshomeopathy.wc77zvf.mongodb.net/?appName=spaksHomeopathy
Production guard: PASSED
Connection: FAILED
  Connection attempt timed out after 10000ms
```

Exit code: 1.

Diagnosis performed at the time (network-layer only, zero credentials involved):

| Check | Method | Result |
|---|---|---|
| DNS SRV resolution | `nslookup -type=SRV _mongodb._tcp.<cluster>` | **PASS** — resolved to 3 real shard hosts on the configured cluster's domain |
| DNS TXT resolution | `nslookup -type=TXT <cluster>` | **PASS** — resolved (`authSource=admin&replicaSet=atlas-m09qwi-shard-0`) |
| General outbound internet | `curl https://www.google.com` | **PASS** — HTTP 200 |
| TCP reachability, port 27017, all 3 shards | `/dev/tcp/<host>/27017` | **PASS** — all three shards accept a TCP connection |
| TLS handshake | `openssl s_client -connect <shard>:27017` | **FAIL** — server sends `TLS alert number 80` ("internal error") immediately, before the handshake completes |

**Conclusion:** the cluster hostname is real and correctly configured
(DNS resolves correctly to genuine Atlas shard infrastructure), and raw
TCP connectivity to the database port is not blocked by any local or
intermediate firewall. The failure occurs specifically during the TLS
handshake, where the Atlas-side server terminates the connection with a
generic internal-error alert rather than completing negotiation. This is
the documented behavior pattern of **MongoDB Atlas's Network Access (IP
allowlist) rejecting a connection from an unrecognized source IP** —
Atlas does this at the TLS layer rather than returning a clean
authentication error, which is also why the Node.js MongoDB driver
observed it as a bare timeout rather than a descriptive error.

This machine's outbound public IP (safe to record, not a credential):
`103.83.129.31`.

**No credential, username, or password was used or required to reach
this diagnosis** — every check above operated below the MongoDB
protocol/auth layer.

**Not excluded by the original diagnosis alone:** invalid credentials
and database-user permission problems were not ruled out by the
network-layer checks, because that failure occurred before
authentication was ever attempted. The successful re-check (§4 above)
now confirms credentials and permissions are in fact valid — the
connection authenticated and the ping succeeded.

---

## 5. DATABASE IDENTITY VERIFICATION

**Classification: VERIFIED AGAINST REAL MONGODB ATLAS**

Performed via a small, temporary, single-purpose script
(`scripts/atlas-smoke-test.ts` — see §12 for its status) that calls the
existing, unmodified `getDb()` (both guards run inside it, unchanged)
and then issues read-only server commands:

```
Connected database name (db.databaseName): spaks_dev
Server responds to hello: YES
  isWritablePrimary: true
  maxWireVersion: 25
  setName (replica set): atlas-m09qwi-shard-0
MongoDB server version: 8.0.29

Database identity check (must be spaks_dev): PASS
```

Confirmed: the database actually reached by the live connection is
`spaks_dev` (not merely the configured target name — this is a value
read back from the server's own `db.databaseName` accessor after a real
connection). The server identifies itself as a writable primary member
of Atlas replica set `atlas-m09qwi-shard-0`, running MongoDB 8.0.29. No
write or collection-creation command was issued — `hello` and
`buildInfo` are both read-only administrative commands.

---

## 6. REPOSITORY SMOKE-TEST RESULT

**Classification: VERIFIED AGAINST REAL MONGODB ATLAS**

Using the same temporary script and the same live `Db` handle:

```
EnquiryRepository constructed with live Db handle: OK
enquiries collection read (find({})): OK — 0 document(s) found
  (Empty result is expected and acceptable — no data has been migrated yet.)
```

Confirmed, against the real Atlas connection:
- A `Db` handle from `getDb()` can be passed into an existing repository
  class (`EnquiryRepository`) unmodified.
- Repository construction succeeds.
- Collection naming resolves correctly (`COLLECTIONS.enquiries`, from
  the existing, unmodified `collections.ts`).
- The Zod schema layer (`enquirySchema`) loads correctly — `find({})`
  would throw on the first document if the schema failed to import or
  parse.
- The `enquiries` collection is currently empty in `spaks_dev` — expected,
  since no migration has been run. Zero documents were fabricated to
  force a non-empty result, per the task's explicit instruction.
- No connection was constructed outside `client.ts` — the script only
  imports and calls the existing `getDb()`.

---

## 7. WHETHER ANY WRITE OCCURRED

**No.** Zero writes were attempted or performed against `spaks_dev` or
any other database, at any point across both the original attempt and
the successful re-check. Step 5's controlled-write-test mechanism was
deliberately skipped: no existing, explicitly isolated write-smoke-test
mechanism was found anywhere in the project (`scripts/`, `src/lib/`,
`tests/` were searched), and the task's own instruction is to skip the
write test rather than invent one when that is the case.

---

## 8. WHETHER ANY COLLECTION WAS CREATED

**No.** No collection-creation code path was invoked. `collections.ts`,
`indexes.ts`, and `collectionSetup.ts` were not called this phase.

---

## 9. WHETHER ANY MIGRATION OCCURRED

**No.** `npm run migrate:mongodb` was not run. No SQL dump data was
migrated. No index was created. This was explicitly out of scope per
Step 6 and was not attempted.

---

## 10. TESTS AND VERIFICATION RESULTS

| Check | Classification | Result |
|---|---|---|
| `npm run typecheck` | VERIFIED LOCALLY | ✅ Pass, 0 errors |
| `npm run lint` | VERIFIED LOCALLY | ✅ Pass, 0 errors, 4 pre-existing warnings (Google-font-display, unrelated to this phase, present in `admin/login/page.tsx` and `AdminStylesheets.tsx` from prior sessions) |
| `npm run format:check` | VERIFIED LOCALLY | ✅ Pass |
| `npm run test` | VERIFIED LOCALLY | ✅ **178/178 pass**, 23 test files, 0 regressions. All fixture/local-data tests — **none of these tests connect to a live database**; the M3-C-labeled tests (`m3c-order-validation.test.ts`, `idempotentReplay.test.ts`, etc.) validate transformation logic against the generated MongoDB-shaped documents from the SQL dump, not a live server |
| `npm run build` | VERIFIED LOCALLY | ✅ Pass, same static/dynamic route split as prior builds, zero regression |
| `npm run mongodb:check` | VERIFIED AGAINST REAL MONGODB ATLAS | ❌ **FAILED** — see §4 |

No test in this suite is labeled `MONGODB-INTEGRATION` or exercises a
live connection; that labeling class (established in
`docs/M4-PREPARATION.md` §6) remains structurally unused, since no live
connection was achieved.

---

## 11. SECURITY REVIEW

| Check | Result |
|---|---|
| Project is a git repository | **No** (`git status` confirms "not a git repository") — no tracked-file/commit risk exists either way this phase |
| `.env.local` modified | **No** — mtime unchanged (`2026-08-20 21:47:39`), predates this phase entirely |
| `.env.local` gitignored | **Yes** (`.gitignore:28`), moot given no git repo, but correct as a matter of hygiene |
| Atlas cluster hostname appears in any source/doc/test file | **No** — swept `src/`, `scripts/`, `docs/`, `tests/`; zero matches |
| Any `mongodb+srv://` literal outside `.env.local` | Two pre-existing matches, both fixtures/placeholders (`myuser:mypassword@cluster0.mongodb.net` in `tests/mongodb/environmentGuard.test.ts`; `<username>:<password>@<cluster-host>` in `docs/MONGODB-SETUP.md`) — neither is the real credential, neither was written this phase |
| `.env.example` modified with the real credential | **No** — still contains only `mongodb://localhost:27017` |
| Credential printed to terminal/logs this phase | **No** — only the tool's own built-in redacted output was ever produced or is reproduced above |
| Credential included in this report | **No** |
| Production guards (`client.ts`, `environmentGuard.ts`) modified | **No** — neither file was opened for editing |
| Laravel source (`public_html/**`, `spakshomeopathy.com/**`) touched | **No** |

**Result: clean.** No credential exposure of any kind occurred this phase.

---

## 12. FILES CHANGED

| Path | Change |
|---|---|
| `docs/GATE-REPORT-M3C-ATLAS-SMOKE.md` | **Created**, then updated in place with the re-check results (this file) |
| `scripts/atlas-smoke-test.ts` | **Created** — temporary, single-purpose diagnostic script for Steps 3–4 (identity verification + repository read smoke test). Not added to `package.json` scripts. Imports only the existing, unmodified `getDb()` and `EnquiryRepository`; constructs no new connection logic, schema, or repository class. **Recommend deleting after this gate report is reviewed** — it served its one-time diagnostic purpose and is not intended as a permanent project script (flagged for owner/implementer follow-up, not deleted unilaterally here per NN-10/G-2) |
| `tsconfig.tsbuildinfo` | Incidentally regenerated by `npm run typecheck` — a build cache artifact, not source; not meaningful and not hand-edited |

**Total created: 2 (1 documentation, 1 temporary diagnostic script). Total modified: 0 (excluding the build cache artifact). Total deleted: 0.**

---

## 13. FILES UNTOUCHED (explicitly verified)

- `src/lib/mongodb/client.ts` — not opened for editing
- `src/lib/mongodb/environmentGuard.ts` — not opened for editing
- `src/lib/mongodb/collections.ts`, `indexes.ts`, `collectionSetup.ts`, `migrationState.ts`
- All migration transformation logic (`src/lib/migration/**`)
- All schemas (`src/lib/mongodb/schemas/**`)
- `.env.local` (mtime unchanged, predates this phase)
- `.env.example`
- All 33 public-site route files under `src/app/`
- All 25 admin UI files under `src/app/admin/`
- Laravel source: `public_html/**`, `spakshomeopathy.com/**`
- Any file implementing authentication, checkout, payments, or orders
- No API route was created or modified

---

## 14. EXACT CURRENT STATUS

- **Atlas connection: ESTABLISHED.** Both safety guards passed; the
  driver connected; the ping succeeded. The original TLS-layer failure
  (§4a) is resolved — most likely an Atlas Network Access condition that
  has since been corrected, though this report does not itself claim
  to know what specifically changed on the Atlas side, only that the
  identical, unmodified code now succeeds where it previously did not.
- **Database reached: `spaks_dev`, confirmed** via a live,
  server-reported `db.databaseName` read (§5) — not merely the
  configured target name.
- **Repository path proven end-to-end, read-only** (§6): `getDb()` →
  `EnquiryRepository` → `find({})` succeeded against the real server,
  returning 0 documents (expected — no data has been migrated).
- **No write occurred. No collection was created. No migration was
  executed.** (§7–9)
- The existing MongoDB architecture (client, guards, repositories,
  schemas, migration tooling) required **zero changes** to reach this
  result — confirming §7 of the prior readiness audit's conclusion that
  no second, competing data-access design is needed.

---

## 15. RECOMMENDED NEXT AUTHORIZED STEP

**Still do not proceed to migration, API wiring, authentication,
checkout, or admin CRUD without a separate, explicit authorization** —
this task's scope was connection + smoke verification only, and that
scope is now complete.

Recommended sequence, each step requiring its own go-ahead:

1. **Review this report and confirm the connection result.** The
   temporary `scripts/atlas-smoke-test.ts` should be deleted once this
   review is done — it was a one-time diagnostic tool, not intended to
   remain in the project (see §12).
2. **Decide on `docs/M3-OWNER-DECISION-RECORDS.md`'s remaining open
   items that gate real data work** — most directly DR-06 (charset
   spot-check for the 6 `latin1` tables) and DR-04 (`users.email`
   unique index, which needs a pre-migration duplicate-email check)
   — before running any real migration against this now-reachable
   database.
3. **Only with a separate, explicit "run the migration" authorization**,
   proceed to `npm run migrate:mongodb` (or its `--dry-run` form first)
   against `spaks_dev` — this was explicitly out of scope for today's
   task and remains so until separately authorized.
4. Authentication, cart, checkout, and admin CRUD wiring remain gated
   behind DR-05 (session store decision) and the milestone sequence
   already laid out in the prior readiness audit — unaffected by
   today's successful connection.

---

## 16. SIGN-OFF

**Implementer:** Migration Implementer **Date:** 2026-08-21

**Owner:** _________________________ **Date:** ___________

**Full migration authorized:** ☐ Yes ☑ **No — connection and read-only
smoke test both now succeed, but migration requires a separate,
explicit authorization per Step 6 of the originating task, not granted
by this report.**

---

*Companion documents: `docs/GATE-REPORT-M3C.md` (2026-08-16, prior
phase), `docs/MONGODB-SETUP.md`, `docs/M3C-MONGODB-INTEGRATION.md`.*

*End of M3-C Atlas Smoke Test Gate Report*
