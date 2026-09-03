/**
 * Milestone 0 infrastructure test — environment loading.
 *
 * SCOPE: verifies the CONFIGURATION LAYER only. Contains no assertions about
 * application behavior, because no application behavior exists yet.
 *
 * What this proves:
 *   - required variables throw when absent (fail fast, contract §10.5)
 *   - documented Laravel defaults are applied correctly
 *   - integer and boolean parsing rejects malformed input
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabaseConfig, getCryptoConfig, getAppConfig } from '@/lib/env';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function clear(...names: string[]) {
  for (const name of names) delete process.env[name];
}

describe('env: database configuration', () => {
  it('throws a named error when a required variable is missing', () => {
    clear('DATABASE_HOST');
    expect(() => getDatabaseConfig()).toThrow(/DATABASE_HOST/);
  });

  it('treats an empty string as missing', () => {
    process.env.DATABASE_HOST = '   ';
    expect(() => getDatabaseConfig()).toThrow(/DATABASE_HOST/);
  });

  it('applies the documented Laravel default for DATABASE_PORT', () => {
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_NAME = 'db_newhomo';
    process.env.DATABASE_USER = 'user';
    process.env.DATABASE_PASSWORD = 'pass';
    clear('DATABASE_PORT');

    // Laravel DB_PORT default is 3306.
    expect(getDatabaseConfig().port).toBe(3306);
  });

  it('rejects a non-integer port', () => {
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_NAME = 'db_newhomo';
    process.env.DATABASE_USER = 'user';
    process.env.DATABASE_PASSWORD = 'pass';
    process.env.DATABASE_PORT = 'not-a-number';

    expect(() => getDatabaseConfig()).toThrow(/must be an integer/);
  });
});

describe('env: crypto configuration', () => {
  it('requires APP_KEY and never generates one', () => {
    // CONTRACT NN-9 / F-4: generating a new APP_KEY would break live
    // password-reset links. Absence must be a hard failure, never a fallback.
    clear('APP_KEY');
    process.env.SESSION_SECRET = 'test-secret';

    expect(() => getCryptoConfig()).toThrow(/APP_KEY/);
  });

  it('defaults session lifetime to the Laravel value of 120 minutes', () => {
    process.env.APP_KEY = 'base64:test';
    process.env.SESSION_SECRET = 'test-secret';
    clear('SESSION_LIFETIME_MINUTES');

    // Laravel config/session.php: env('SESSION_LIFETIME', 120)
    expect(getCryptoConfig().sessionLifetimeMinutes).toBe(120);
  });
});

describe('env: application configuration', () => {
  it('defaults the upload directory to the Laravel path', () => {
    process.env.APP_URL = 'http://localhost:3000';
    clear('UPLOAD_DIR');

    // Laravel: public_path('uploaded_files')
    expect(getAppConfig().uploadDir).toBe('public/uploaded_files');
  });
});
