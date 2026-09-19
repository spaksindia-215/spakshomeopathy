/**
 * `src/middleware.ts` tests — CR-006 Phase 10
 * (`docs/CR-006-PHASE-10-PLAN.md` §2.1.1).
 *
 * NO PRIOR PRECEDENT IN THIS CODEBASE for testing a `middleware.ts`
 * module directly — every existing test covers the repository/service/
 * schema/guard layer, never `NextRequest`/`NextResponse` themselves.
 * This file imports the real `middleware` export and calls it with a
 * REAL `NextRequest` instance (`next/server`'s own class constructs
 * cleanly outside a running Next.js server, confirmed directly this
 * phase) — not a hand-rolled stand-in, no real HTTP request either.
 *
 * MOCKS `global.fetch` (the middleware's only external dependency,
 * `/api/redirects`) rather than a real server — same FIXTURE-level
 * posture as every other test in this codebase, applied to a new layer.
 *
 * MODULE-LEVEL CACHE: `middleware.ts` keeps its 60s redirect-rule cache
 * in a module-level variable, which persists across `it()` blocks within
 * the same imported module instance. Each test calls `vi.resetModules()`
 * and re-imports the module fresh, so no test's cache state leaks into
 * another's — the alternative (sharing one cache across all tests) would
 * make test order matter, which this suite deliberately avoids.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

describe('middleware (CR-006 Phase 8, tested CR-006 Phase 10)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('redirects with the configured status code and Location when the path matches a rule', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rules: [{ fromPath: '/old-page', toPath: '/new-page', statusCode: 301 }],
      }),
    }) as unknown as typeof fetch;

    const { middleware } = await import('@/middleware');
    const response = await middleware(new NextRequest('http://localhost:3000/old-page'));

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('/new-page');
  });

  it('respects a 302 status code when configured', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rules: [{ fromPath: '/temp-old', toPath: '/temp-new', statusCode: 302 }],
      }),
    }) as unknown as typeof fetch;

    const { middleware } = await import('@/middleware');
    const response = await middleware(new NextRequest('http://localhost:3000/temp-old'));

    expect(response.status).toBe(302);
  });

  it('passes through (no redirect) when the path does not match any rule', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        rules: [{ fromPath: '/old-page', toPath: '/new-page', statusCode: 301 }],
      }),
    }) as unknown as typeof fetch;

    const { middleware } = await import('@/middleware');
    const response = await middleware(new NextRequest('http://localhost:3000/unrelated-page'));

    expect(response.status).not.toBe(301);
    expect(response.status).not.toBe(302);
  });

  it('fails open (passes through, does not throw) when /api/redirects is unreachable', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('simulated network failure'));

    const { middleware } = await import('@/middleware');
    await expect(
      middleware(new NextRequest('http://localhost:3000/any-page'))
    ).resolves.not.toThrow();
  });

  it('fails open when /api/redirects returns a non-ok response', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;

    const { middleware } = await import('@/middleware');
    const response = await middleware(new NextRequest('http://localhost:3000/any-page'));

    expect(response.status).not.toBe(301);
    expect(response.status).not.toBe(302);
  });

  it('caches the rule set — a second request within the TTL does not re-fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rules: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { middleware } = await import('@/middleware');
    await middleware(new NextRequest('http://localhost:3000/first'));
    await middleware(new NextRequest('http://localhost:3000/second'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('excludes /admin, /api, and static-asset paths via the exported matcher config', async () => {
    const { config } = await import('@/middleware');
    const matcherSource = Array.isArray(config.matcher) ? config.matcher[0] : config.matcher;

    // Sanity-checks the matcher's own literal exclusion list rather than
    // re-deriving Next.js's exact matcher-compilation semantics — this
    // guards against someone editing the exclusion list and silently
    // dropping a path category, without needing a full Next.js router
    // to evaluate the real compiled matcher.
    expect(matcherSource).toContain('admin');
    expect(matcherSource).toContain('api');
    expect(matcherSource).toContain('_next/static');
    expect(matcherSource).toContain('uploaded_files');
  });
});
