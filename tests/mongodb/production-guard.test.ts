/**
 * Exercises client.ts's getMongoClient() production guard directly,
 * WITHOUT ever opening a real network connection.
 *
 * `mongodb`'s MongoClient.connect() is mocked so this test proves the
 * guard fires (or doesn't) BEFORE any real connection attempt would occur
 * — the mock's connect() would throw if ever called with a URI this test
 * doesn't expect, but more importantly, the production-blocked case must
 * throw ProductionConnectionBlockedError WITHOUT connect() being called at
 * all, which is asserted explicitly below.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const connectMock = vi.fn().mockResolvedValue(undefined);

vi.mock('mongodb', () => {
  return {
    MongoClient: vi.fn().mockImplementation(() => ({
      connect: connectMock,
      db: vi.fn().mockReturnValue({ collection: vi.fn() }),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  connectMock.mockClear();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe('getMongoClient production guard', () => {
  it('throws ProductionConnectionBlockedError and never calls connect() when env=production without the allow flag', async () => {
    process.env.MONGODB_URI = 'mongodb://prod-should-never-be-reached';
    process.env.MONGODB_DB_NAME = 'spaks_prod';
    process.env.MONGODB_ENV = 'production';
    delete process.env.MONGODB_ALLOW_PRODUCTION;

    const { getMongoClient, ProductionConnectionBlockedError } = await import(
      '@/lib/mongodb/client'
    );

    await expect(getMongoClient()).rejects.toThrow(ProductionConnectionBlockedError);
    expect(connectMock).not.toHaveBeenCalled();
  });

  it('calls connect() when env=production WITH the explicit allow flag set', async () => {
    process.env.MONGODB_URI = 'mongodb://prod-explicitly-authorized';
    process.env.MONGODB_DB_NAME = 'spaks_prod';
    process.env.MONGODB_ENV = 'production';
    process.env.MONGODB_ALLOW_PRODUCTION = 'true';

    const { getMongoClient } = await import('@/lib/mongodb/client');

    await getMongoClient();
    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it('calls connect() normally for a development environment (no guard applies)', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    process.env.MONGODB_DB_NAME = 'spaks_dev';
    process.env.MONGODB_ENV = 'development';

    const { getMongoClient } = await import('@/lib/mongodb/client');

    await getMongoClient();
    expect(connectMock).toHaveBeenCalledTimes(1);
  });
});
