/**
 * M3-A environment/safety-guard tests.
 *
 * DATABASE SAFETY (owner instruction, 2026-08-16): "Do not connect to or
 * modify a production Atlas cluster unless I explicitly provide
 * authorization and credentials for that operation." These tests prove
 * getMongoConfig()'s fail-fast validation and the production-connection
 * guard's LOGIC — without ever opening a real connection (no
 * MongoClient.connect() call anywhere in this file).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getMongoConfig } from '@/lib/env';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function setValidDevEnv() {
  process.env.MONGODB_URI = 'mongodb://localhost:27017';
  process.env.MONGODB_DB_NAME = 'spaks_dev';
  process.env.MONGODB_ENV = 'development';
}

describe('getMongoConfig', () => {
  it('throws when MONGODB_URI is missing', () => {
    setValidDevEnv();
    delete process.env.MONGODB_URI;
    expect(() => getMongoConfig()).toThrow(/MONGODB_URI/);
  });

  it('throws when MONGODB_DB_NAME is missing', () => {
    setValidDevEnv();
    delete process.env.MONGODB_DB_NAME;
    expect(() => getMongoConfig()).toThrow(/MONGODB_DB_NAME/);
  });

  it('throws when MONGODB_ENV is missing (no silent default to "development")', () => {
    setValidDevEnv();
    delete process.env.MONGODB_ENV;
    expect(() => getMongoConfig()).toThrow(/MONGODB_ENV/);
  });

  it('throws when MONGODB_ENV is an unrecognized value rather than treating it as safe', () => {
    setValidDevEnv();
    process.env.MONGODB_ENV = 'staging'; // not one of development/test/production
    expect(() => getMongoConfig()).toThrow(/MONGODB_ENV must be one of/);
  });

  it('accepts "development", "test", "production" as the only valid MONGODB_ENV values', () => {
    setValidDevEnv();
    for (const env of ['development', 'test', 'production']) {
      process.env.MONGODB_ENV = env;
      expect(() => getMongoConfig()).not.toThrow();
    }
  });

  it('defaults allowProduction to false when MONGODB_ALLOW_PRODUCTION is unset', () => {
    setValidDevEnv();
    const config = getMongoConfig();
    expect(config.allowProduction).toBe(false);
  });

  it('sets allowProduction to true only when MONGODB_ALLOW_PRODUCTION is exactly "true"', () => {
    setValidDevEnv();
    process.env.MONGODB_ALLOW_PRODUCTION = 'yes'; // not the exact string "true"
    expect(getMongoConfig().allowProduction).toBe(false);

    process.env.MONGODB_ALLOW_PRODUCTION = 'true';
    expect(getMongoConfig().allowProduction).toBe(true);
  });

  it('a development config never reports env as production', () => {
    setValidDevEnv();
    expect(getMongoConfig().env).toBe('development');
  });
});

describe('production-connection guard logic (docs/GATE-REPORT-M3A.md)', () => {
  // These tests exercise the SAME condition getMongoClient() checks
  // (config.env === 'production' && !config.allowProduction) without
  // importing client.ts, which would pull in the `mongodb` driver and risk
  // an accidental real connection attempt in a test environment. The
  // client.ts module itself is exercised in production-guard.test.ts via
  // its exported error class and a mocked connect path — see that file.

  it('blocks production env without the explicit allow flag', () => {
    process.env.MONGODB_URI = 'mongodb://prod-should-never-be-reached';
    process.env.MONGODB_DB_NAME = 'spaks_prod';
    process.env.MONGODB_ENV = 'production';
    delete process.env.MONGODB_ALLOW_PRODUCTION;

    const config = getMongoConfig();
    expect(config.env).toBe('production');
    expect(config.allowProduction).toBe(false);
    // The guard condition in client.ts's getMongoClient() is:
    //   if (config.env === 'production' && !config.allowProduction) throw
    expect(config.env === 'production' && !config.allowProduction).toBe(true);
  });

  it('permits production env only when BOTH env=production AND allowProduction=true are set together', () => {
    process.env.MONGODB_URI = 'mongodb://prod-explicitly-authorized';
    process.env.MONGODB_DB_NAME = 'spaks_prod';
    process.env.MONGODB_ENV = 'production';
    process.env.MONGODB_ALLOW_PRODUCTION = 'true';

    const config = getMongoConfig();
    expect(config.env === 'production' && !config.allowProduction).toBe(false);
  });
});
