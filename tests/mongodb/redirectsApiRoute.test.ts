/**
 * `src/app/api/redirects/route.ts` tests — CR-006 Phase 10
 * (`docs/CR-006-PHASE-10-PLAN.md` §2.1.2).
 *
 * Mocks `@/lib/mongodb/client`'s `getDb` (same pattern
 * `tests/cart/cartActions.test.ts` already established) and
 * `@/lib/redirects/repository`'s `RedirectRepository` — this route's two
 * dependencies — so no real database connection is used or needed.
 *
 * THE HIGH-VALUE ASSERTION HERE: `src/middleware.ts`'s own fail-open
 * guarantee (it treats a non-ok response as "no redirects apply" rather
 * than blocking traffic) depends entirely on THIS route never returning
 * an actual error status when its database dependency fails — this test
 * proves that contract holds, not just that the happy path works.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

const findAllMock = vi.fn();

vi.mock('@/lib/mongodb/client', () => ({
  getDb: vi.fn(async () => ({})),
}));

vi.mock('@/lib/redirects/repository', () => ({
  RedirectRepository: vi.fn().mockImplementation(() => ({
    findAll: findAllMock,
  })),
}));

describe('GET /api/redirects', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the real rule set when the database is reachable', async () => {
    const sampleRule = {
      id: 'rd-1',
      fromPath: '/old',
      toPath: '/new',
      statusCode: 301,
      createdAt: '2026-09-16T00:00:00.000Z',
      updatedAt: '2026-09-16T00:00:00.000Z',
    };
    findAllMock.mockResolvedValue([sampleRule]);

    const { GET } = await import('@/app/api/redirects/route');
    const response = await GET();
    const body = (await response.json()) as { rules: unknown[] };

    expect(response.status).toBe(200);
    expect(body.rules).toEqual([sampleRule]);
  });

  it('returns an empty rule list, NOT an error status, when the repository throws', async () => {
    findAllMock.mockRejectedValue(new Error('simulated database outage'));

    const { GET } = await import('@/app/api/redirects/route');
    const response = await GET();
    const body = (await response.json()) as { rules: unknown[] };

    // The critical contract: still 200, still valid JSON, empty rules —
    // never a 500 that would break middleware.ts's fail-open assumption.
    expect(response.status).toBe(200);
    expect(body.rules).toEqual([]);
  });

  it('returns an empty rule list when getDb itself throws (unconfigured database)', async () => {
    const { getDb } = await import('@/lib/mongodb/client');
    vi.mocked(getDb).mockRejectedValueOnce(new Error('MONGODB_URI not set'));

    const { GET } = await import('@/app/api/redirects/route');
    const response = await GET();
    const body = (await response.json()) as { rules: unknown[] };

    expect(response.status).toBe(200);
    expect(body.rules).toEqual([]);
  });
});
