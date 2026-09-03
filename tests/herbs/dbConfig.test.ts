/**
 * `getHerbsDbConfig` / `isHerbsDbConfigured` tests (UNIT — no MongoDB
 * involved at all, just env-var reading).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getHerbsDbConfig, isHerbsDbConfigured } from '@/lib/herbs/db/config';

const ENV_KEYS = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'MONGODB_ENV',
  'MONGODB_ALLOW_PRODUCTION',
] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('getHerbsDbConfig / isHerbsDbConfigured', () => {
  it('returns null and reports unconfigured when no MONGODB_* vars are set', () => {
    expect(getHerbsDbConfig()).toBeNull();
    expect(isHerbsDbConfigured()).toBe(false);
  });

  it('returns null when MONGODB_ENV has an invalid value', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.MONGODB_DB_NAME = 'spaks_dev';
    process.env.MONGODB_ENV = 'staging'; // not one of development/test/production
    expect(getHerbsDbConfig()).toBeNull();
  });

  it('returns a config with the dbName suffixed "_herbs", isolated from the base migration database', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.MONGODB_DB_NAME = 'spaks_dev';
    process.env.MONGODB_ENV = 'development';

    const config = getHerbsDbConfig();
    expect(config).not.toBeNull();
    expect(config?.dbName).toBe('spaks_dev_herbs');
    expect(config?.env).toBe('development');
    expect(config?.allowProduction).toBe(false);
    expect(isHerbsDbConfigured()).toBe(true);
  });

  it('allowProduction is true only when MONGODB_ALLOW_PRODUCTION is exactly "true"', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.MONGODB_DB_NAME = 'spaks_dev';
    process.env.MONGODB_ENV = 'production';
    process.env.MONGODB_ALLOW_PRODUCTION = 'yes';
    expect(getHerbsDbConfig()?.allowProduction).toBe(false);

    process.env.MONGODB_ALLOW_PRODUCTION = 'true';
    expect(getHerbsDbConfig()?.allowProduction).toBe(true);
  });
});
