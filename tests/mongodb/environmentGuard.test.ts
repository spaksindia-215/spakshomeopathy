/**
 * M3-C "fail closed" positive-identification guard tests.
 *
 * Owner instruction (M3-C §1/§12, NON-NEGOTIABLE): "If the environment
 * cannot be positively identified as NON-PRODUCTION, abort before
 * connecting. Fail closed." These tests exercise the identification LOGIC
 * directly — no real connection is ever attempted.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  identifyEnvironment,
  redactUri,
  assertNonProductionTarget,
  UnidentifiedEnvironmentError,
} from '@/lib/mongodb/environmentGuard';

describe('redactUri', () => {
  it('redacts username:password from a connection string', () => {
    const uri = 'mongodb+srv://myuser:mypassword@cluster0.mongodb.net/spaks_dev';
    const redacted = redactUri(uri);
    expect(redacted).not.toContain('myuser');
    expect(redacted).not.toContain('mypassword');
    expect(redacted).toContain('<redacted>');
  });

  it('leaves a credential-free URI unchanged', () => {
    const uri = 'mongodb://localhost:27017';
    expect(redactUri(uri)).toBe(uri);
  });
});

describe('identifyEnvironment', () => {
  it('identifies localhost + a dev-marked db name as non-production', () => {
    const result = identifyEnvironment('mongodb://localhost:27017', 'spaks_dev');
    expect(result.identifiedAsNonProduction).toBe(true);
  });

  it('identifies an explicitly "test"-marked target as non-production', () => {
    const result = identifyEnvironment('mongodb://localhost:27017', 'spaks_test');
    expect(result.identifiedAsNonProduction).toBe(true);
  });

  it('refuses a URI containing "prod" even if MONGODB_ENV would claim development', () => {
    const result = identifyEnvironment('mongodb+srv://cluster-prod.mongodb.net', 'spaks_dev');
    expect(result.identifiedAsNonProduction).toBe(false);
    expect(result.reason).toMatch(/production-indicator/);
  });

  it('refuses a database name containing "production"', () => {
    const result = identifyEnvironment('mongodb://localhost:27017', 'spaks_production');
    expect(result.identifiedAsNonProduction).toBe(false);
  });

  it('refuses the real project domain name with no dev/test qualifier', () => {
    const result = identifyEnvironment('mongodb+srv://cluster.mongodb.net', 'spakshomeopathy');
    expect(result.identifiedAsNonProduction).toBe(false);
  });

  it('allows the real project domain name WHEN qualified with "dev"', () => {
    const result = identifyEnvironment('mongodb+srv://cluster.mongodb.net', 'spakshomeopathy-dev');
    expect(result.identifiedAsNonProduction).toBe(true);
  });

  it('refuses an AMBIGUOUS target with no explicit non-production marker at all', () => {
    const result = identifyEnvironment('mongodb://localhost:27017', 'somedatabase');
    expect(result.identifiedAsNonProduction).toBe(false);
    expect(result.reason).toMatch(/ambiguous|does not contain/i);
  });

  it('refuses a target containing BOTH a production and a non-production marker (ambiguity is not identification)', () => {
    const result = identifyEnvironment('mongodb://localhost:27017', 'prod-but-also-dev');
    expect(result.identifiedAsNonProduction).toBe(false);
  });

  it('redacts credentials in the returned checkedUri even on a refused identification', () => {
    const result = identifyEnvironment(
      'mongodb+srv://user:pass@cluster-prod.mongodb.net',
      'spaks_dev'
    );
    expect(result.checkedUri).not.toContain('user:pass');
  });
});

describe('assertNonProductionTarget — integrated with getMongoConfig', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('throws UnidentifiedEnvironmentError for a production-looking URI even with MONGODB_ENV=development', () => {
    process.env.MONGODB_URI = 'mongodb+srv://cluster-production.mongodb.net';
    process.env.MONGODB_DB_NAME = 'spaks_dev';
    process.env.MONGODB_ENV = 'development'; // the M3-A flag says "safe"...
    // ...but this guard independently inspects the URI content and must
    // still refuse, because a misconfigured flag must not be trusted alone.
    expect(() => assertNonProductionTarget()).toThrow(UnidentifiedEnvironmentError);
  });

  it('does not throw for a properly-identified local development target', () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.MONGODB_DB_NAME = 'spaks_dev';
    process.env.MONGODB_ENV = 'development';
    expect(() => assertNonProductionTarget()).not.toThrow();
  });

  it('throws for an ambiguous target with no dev/test/local/staging marker anywhere', () => {
    process.env.MONGODB_URI = 'mongodb+srv://cluster0.abc123.mongodb.net';
    process.env.MONGODB_DB_NAME = 'myapp';
    process.env.MONGODB_ENV = 'development';
    expect(() => assertNonProductionTarget()).toThrow(UnidentifiedEnvironmentError);
  });
});
