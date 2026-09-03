/**
 * Environment variable loading and validation.
 *
 * MILESTONE 0 SCOPE
 * -----------------
 * Infrastructure only. This module reads and validates configuration.
 * It contains NO application behavior, NO business rules, and NO defaults
 * that could mask a misconfiguration.
 *
 * MIGRATION CONTRACT NOTES
 * ------------------------
 * - Fail fast, never guess. Contract §10.5: when uncertain, do nothing and
 *   surface it. A missing variable throws at startup rather than silently
 *   falling back to a value that might differ from Laravel's behavior.
 *
 * - Defaults are provided ONLY where the Laravel application itself has a
 *   known, documented constant (e.g. SESSION_LIFETIME_MINUTES=120, which
 *   Laravel's config/session.php sets from SESSION_LIFETIME with the same
 *   default). Every such default is annotated with its Laravel source.
 *
 * - No secret is ever logged or included in an error message.
 */

/** Reads a required variable. Throws if absent or empty. */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `See .env.example for the expected value and its Laravel origin.`
    );
  }
  return value;
}

/** Reads an optional variable, returning undefined when absent or empty. */
function optional(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') return undefined;
  return value;
}

/**
 * Reads a variable that has a documented Laravel default.
 * `laravelSource` records where the default comes from, so it can be audited.
 */
function withLaravelDefault(name: string, fallback: string, _laravelSource: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') return fallback;
  return value;
}

function toInt(name: string, raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, received: "${raw}"`);
  }
  return parsed;
}

function toBool(name: string, raw: string): boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`Environment variable ${name} must be "true" or "false", received: "${raw}"`);
}

/**
 * Database configuration.
 *
 * Lazily evaluated so that importing this module (e.g. in a unit test that
 * does not touch the database) does not require database credentials.
 *
 * SUPERSEDED BY OWNER DECISION D-11 (2026-08-16, docs/D-11-DATABASE-ARCHITECTURE.md)
 * -----------------------------------------------------------------------------------
 * D-11 makes MongoDB Atlas the target production database, not MariaDB/MySQL.
 * This function (and the Kysely/MySQL connection layer in `src/lib/db/`) is
 * RETAINED, NOT DELETED — contract NN-10/G-2 forbid deletion without approval,
 * and this module was never wired into any application code, so retaining it
 * carries no behavioral risk. It is dead configuration as of D-11, kept only
 * for historical/audit continuity. New code should use `getMongoConfig()`
 * below instead.
 */
export function getDatabaseConfig() {
  return {
    host: required('DATABASE_HOST'),
    port: toInt('DATABASE_PORT', withLaravelDefault('DATABASE_PORT', '3306', 'Laravel DB_PORT')),
    database: required('DATABASE_NAME'),
    user: required('DATABASE_USER'),
    password: required('DATABASE_PASSWORD'),
    poolSize: toInt(
      'DATABASE_POOL_SIZE',
      withLaravelDefault('DATABASE_POOL_SIZE', '10', 'no Laravel equivalent; Node-specific')
    ),
  } as const;
}

/**
 * MongoDB configuration (Owner Decision D-11 — the active target database layer).
 *
 * DATABASE SAFETY (owner instruction, 2026-08-16, M3-A authorization)
 * ---------------------------------------------------------------------
 * - Credentials are NEVER hardcoded; always read from the environment.
 * - `MONGODB_ENV` is a required, explicit marker so a connection can never
 *   silently target production. There is no default — an unset value throws,
 *   forcing every environment (including CI and local dev) to state its
 *   intent explicitly rather than fall through to a guessed default that
 *   could accidentally be "production".
 * - This function performs NO connection. It only reads and validates
 *   configuration. See `src/lib/mongodb/client.ts` for the connection layer,
 *   which additionally refuses to proceed if `MONGODB_ENV=production` without
 *   a second, explicit confirmation flag (`MONGODB_ALLOW_PRODUCTION=true`) —
 *   belt-and-suspenders against an accidental production write during this
 *   phase, per the owner's explicit "do not connect to or modify a production
 *   Atlas cluster unless I explicitly provide authorization" instruction.
 */
export function getMongoConfig() {
  const mongoEnv = required('MONGODB_ENV');
  if (mongoEnv !== 'development' && mongoEnv !== 'test' && mongoEnv !== 'production') {
    throw new Error(
      `MONGODB_ENV must be one of "development", "test", "production" — received: "${mongoEnv}". ` +
        `This is a deliberate fail-fast check: an unrecognized value must never be treated as a ` +
        `safe default.`
    );
  }
  return {
    uri: required('MONGODB_URI'),
    dbName: required('MONGODB_DB_NAME'),
    env: mongoEnv,
    allowProduction: optional('MONGODB_ALLOW_PRODUCTION') === 'true',
  } as const;
}

/**
 * Session and cryptography configuration.
 *
 * CONTRACT NN-9: APP_KEY must be the Laravel APP_KEY verbatim. It is required
 * (never defaulted, never generated) because generating a new one would break
 * live password-reset links and order-cancellation URLs.
 */
export function getCryptoConfig() {
  return {
    appKey: required('APP_KEY'),
    sessionSecret: required('SESSION_SECRET'),
    sessionLifetimeMinutes: toInt(
      'SESSION_LIFETIME_MINUTES',
      withLaravelDefault(
        'SESSION_LIFETIME_MINUTES',
        '120',
        'Laravel config/session.php: env(SESSION_LIFETIME, 120)'
      )
    ),
  } as const;
}

/** Mail configuration. */
export function getMailConfig() {
  return {
    host: required('SMTP_HOST'),
    port: toInt('SMTP_PORT', withLaravelDefault('SMTP_PORT', '465', 'Laravel MAIL_PORT')),
    secure: toBool(
      'SMTP_SECURE',
      withLaravelDefault('SMTP_SECURE', 'true', 'Laravel MAIL_ENCRYPTION=ssl')
    ),
    user: required('SMTP_USER'),
    password: required('SMTP_PASSWORD'),
    sender: required('MAIL_SENDER'),
    enquiryRecipient: required('ENQUIRY_RECIPIENT'),
    enquiryFrom: required('ENQUIRY_FROM'),
  } as const;
}

/** Application configuration. */
export function getAppConfig() {
  return {
    url: required('APP_URL'),
    uploadDir: withLaravelDefault(
      'UPLOAD_DIR',
      'public/uploaded_files',
      'Laravel public_path("uploaded_files")'
    ),
  } as const;
}

/** Optional variable accessor, exported for use by infrastructure modules. */
export { optional as optionalEnv };
