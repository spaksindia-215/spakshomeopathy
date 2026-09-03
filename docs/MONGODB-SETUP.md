# MongoDB Atlas Setup — Non-Production Development/Test Database

**Purpose:** exactly what the owner needs to do to create an isolated,
non-production MongoDB Atlas environment for M3-C. This document contains
**no credentials and no real connection string** — placeholders only.

**Audience:** the owner, when ready to create the Atlas environment
referenced in `docs/GATE-REPORT-M3C.md`. Nothing in this document requires
or assumes a live connection exists yet.

**Related:** `docs/GATE-REPORT-M3C.md`, `docs/M3C-MONGODB-INTEGRATION.md`,
`.env.example`, `src/lib/mongodb/environmentGuard.ts`.

---

## 1. Create an Atlas account and cluster

1. Go to <https://www.mongodb.com/cloud/atlas/register> and create an
   account (or sign in to an existing one).
2. Create a new **Project** — a dedicated project for this migration is
   recommended so it's easy to find and, later, easy to tear down without
   touching anything else in the account.
3. Inside that project, create a new **Cluster**.

### Recommended free/development configuration

- **Tier:** the free shared tier (Atlas currently calls this **M0**) is
  sufficient for this phase — it supports the full feature set this
  codebase uses (standard CRUD, indexes, `ping`). There is no need for a
  paid/dedicated tier for development or smoke testing.
- **Cloud provider/region:** any region is fine for development; picking
  one geographically close to wherever you run the migration script
  reduces latency but does not affect correctness.
- **Cluster name:** name it something that is unambiguously
  non-production, e.g. `spaks-dev` or `spaks-test`. This matters later —
  see §6.

---

## 2. Create a database user

1. In the Atlas project, go to **Database Access** → **Add New Database
   User**.
2. Use **Password** authentication (simplest for this use case).
3. Give the user a role scoped to this project only —
   **Read and write to any database** (or, if you want to scope it
   further, read/write access restricted to the one database you'll
   create in §6) is sufficient. Do **not** reuse a production database
   user's credentials here, even if one already exists in your Atlas
   account from unrelated work.
4. Record the username and password somewhere safe (a password manager) —
   they are needed once, to build the connection string in §5, and then
   only ever live in your local `.env.local` (§7). They must never be
   pasted into a chat, a committed file, or this documentation.

---

## 3. Network access

1. Go to **Network Access** → **Add IP Address**.
2. For local development, adding your current machine's IP address (Atlas
   offers an "Add Current IP Address" button) is the most restrictive and
   recommended option.
3. If the migration script will run from a machine with a changing IP
   (e.g. a laptop that moves networks), either update this entry as
   needed, or — only if you accept the reduced network-level security for
   this specific non-production database — use `0.0.0.0/0` ("allow
   access from anywhere"). Because this is a throwaway dev/test database
   containing no real customer data until you explicitly migrate it in,
   the risk profile here is different from a production cluster, but the
   more restrictive option is still preferred when practical.

---

## 4. What database name to use

**This is enforced by code, not just convention.**
`src/lib/mongodb/environmentGuard.ts`'s `assertNonProductionTarget()`
refuses to proceed unless the **database name itself** (not just the
cluster name or URI) contains one of these markers, using a `_`/`-`/`.`/
word-boundary-aware match:

- `dev`
- `test`
- `local` (or `localhost`)
- `staging`

Recommended: `spaks_dev` or `spaks-dev` (matches `.env.example`'s existing
placeholder). Anything containing `prod`, `production`, `live`, or the
bare project name `spakshomeopathy` (without one of the above markers
also present) is **actively rejected**, regardless of what
`MONGODB_ENV` claims — see §8 for why this exists as a second,
independent check.

Do not create the database itself manually in Atlas — the migration
tooling creates collections on first connection (`ensureCollections()`,
`docs/M3C-MONGODB-INTEGRATION.md` §3). You only need to decide the *name*
here, which becomes part of the connection string in §5.

---

## 5. Obtaining the connection string

1. In the Atlas cluster view, click **Connect**.
2. Choose **Drivers** (not Compass, not the shell — this project uses the
   official Node.js `mongodb` driver directly).
3. Select **Node.js** as the driver. Atlas shows a connection string of
   this shape:

   ```
   mongodb+srv://<username>:<password>@<cluster-host>/?retryWrites=true&w=majority
   ```

4. Replace `<username>` and `<password>` with the database user created in
   §2 (URL-encode the password if it contains special characters — Atlas's
   own UI does this automatically if you paste the password into its
   connection-string builder).
5. This full string — with real credentials embedded — is what goes into
   `MONGODB_URI` in `.env.local` (§7). **It must never be pasted into
   this document, into a commit, into a chat message, or into any file
   under version control.**

---

## 6. Required environment variables

Four variables, all read by `src/lib/env.ts`'s `getMongoConfig()`:

| Variable | Required | Example (placeholder) | Notes |
|---|---|---|---|
| `MONGODB_URI` | Yes | `<NON_PRODUCTION_MONGODB_URI>` | The full connection string from §5, with real credentials. Never commit this. |
| `MONGODB_DB_NAME` | Yes | `spaks_dev` | Must contain a `dev`/`test`/`local`/`staging` marker — see §4. |
| `MONGODB_ENV` | Yes, no default | `development` | Must be exactly `development`, `test`, or `production`. No fallback value exists — an unset value throws rather than guessing. |
| `MONGODB_ALLOW_PRODUCTION` | No | `false` | Second, independent confirmation flag. Leave `false` (or unset) for this non-production setup — see §8. |

---

## 7. Where credentials should be stored

**`.env.local`, in the project root
(`spakshomeopathy-next/.env.local`), and nowhere else.**

- `.env.local` is already listed in `.gitignore` (confirmed:
  `.env`, `.env.local`, `.env.development.local`, `.env.test.local`,
  `.env.production.local` are all excluded) — it will not be committed by
  normal git operations.
- Copy the four variables from §6 into `.env.local`, using the real
  connection string from §5 for `MONGODB_URI`.
- `.env.example` (committed, safe) already documents the same four
  variables with placeholder values only — use it as the template.
- Do not put the real connection string in any other file, script,
  README, issue tracker, or chat transcript. If a credential is ever
  pasted somewhere it shouldn't be, treat it as compromised — rotate the
  database user's password in Atlas (§2) immediately.

---

## 8. How to verify the connection safely

Once `.env.local` is populated, run:

```bash
npm run mongodb:check
```

(`scripts/check-mongodb-connection.ts`) This command:

1. Loads and validates the environment (fails fast if any of the four
   variables in §6 is missing or malformed).
2. Runs `assertNonProductionTarget()` — independently inspects the URI
   and database name for production-indicator patterns (`prod`,
   `production`, `live`, the bare project name) and refuses to proceed if
   found, **regardless of what `MONGODB_ENV` says**. This is a defense-in-
   depth check, separate from the flag-based guard below — a
   misconfigured `.env.local` that accidentally points at a
   production-looking target cannot sail through just because
   `MONGODB_ENV=development` is set.
3. Runs the M3-A production-flag guard (`getDb()` in `client.ts`) — a
   second, independent check that refuses `MONGODB_ENV=production` unless
   `MONGODB_ALLOW_PRODUCTION=true` is also explicitly set.
4. Connects, with a 10-second timeout (fails fast on an unreachable
   target rather than hanging).
5. Runs a `ping` command against the database.
6. Reports success/failure and closes the connection.

**Output only ever includes:** the `MONGODB_ENV` value, the database name,
a redacted host (credentials stripped via `redactUri()`), and pass/fail
status for each step. **It never prints the username, password, or full
connection string** — confirmed by reading `scripts/check-mongodb-connection.ts`
directly; the raw `MONGODB_URI` value is never assigned to a variable
this script logs.

Example successful output:

```
MongoDB environment: development
Database: spaks_dev
Target host (redacted): mongodb+srv://<redacted>@cluster0.abc123.mongodb.net
Production guard: PASSED
Connection: SUCCESS
Ping: SUCCESS
```

If this command fails, **do not** loosen the guard, hardcode a fallback,
or set `MONGODB_ALLOW_PRODUCTION=true` to work around it. Fix the
underlying cause (network access in §3, credentials in §2, or the
database name marker in §4) instead.

---

## 9. What happens after the connection check passes

Only after `npm run mongodb:check` reports all green:

- `npm run migrate:mongodb:dry-run` can be re-run (it never connects
  regardless, but confirms the document counts you'll expect to see).
- `npm run migrate:mongodb` becomes safe to run for the actual smoke
  migration described in `docs/GATE-REPORT-M3C.md`.

This is intentionally the owner's decision to make, not something any
script or agent does automatically. See `docs/GATE-REPORT-M3C.md` for the
current status and exactly what remains before that point.
