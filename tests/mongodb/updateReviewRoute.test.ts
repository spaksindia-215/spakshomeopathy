/**
 * `src/app/admin/update-review/[productId]/[reviewId]/[status]/route.ts`
 * tests — CR-006 Phase 10 (`docs/CR-006-PHASE-10-PLAN.md` §2.1.3).
 * Mirrors `ReviewUpdate($id, $status)` (Phase 7).
 *
 * Mocks `requireAdminSession` (auth), `setFlash` (uses `next/headers`'
 * `cookies()`, which throws outside a real request context), `getDb`,
 * and `ProductRepository` — this route's four dependencies — so no real
 * database or Next.js request context is used or needed.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const updateReviewStatusMock = vi.fn();
const requireAdminSessionMock = vi.fn();
const setFlashMock = vi.fn();

vi.mock('@/lib/auth/guard', () => ({
  requireAdminSession: () => requireAdminSessionMock(),
}));

vi.mock('@/lib/auth/flash', () => ({
  setFlash: (kind: string, value: string) => setFlashMock(kind, value),
}));

vi.mock('@/lib/mongodb/client', () => ({
  getDb: vi.fn(async () => ({})),
}));

vi.mock('@/lib/mongodb/repositories/productRepository', () => ({
  ProductRepository: vi.fn().mockImplementation(() => ({
    updateReviewStatus: updateReviewStatusMock,
  })),
}));

describe('GET /admin/update-review/[productId]/[reviewId]/[status]', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls updateReviewStatus with the parsed ids/status and redirects to review-list', async () => {
    requireAdminSessionMock.mockResolvedValue({ userId: 1, utype: 1, email: 'a@b.invalid' });
    const { GET } = await import('@/app/admin/update-review/[productId]/[reviewId]/[status]/route');

    const request = new NextRequest('http://localhost:3000/admin/update-review/5/1/0');
    const response = await GET(request, {
      params: Promise.resolve({ productId: '5', reviewId: '1', status: '0' }),
    });

    expect(updateReviewStatusMock).toHaveBeenCalledWith(5, 1, 0);
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin/review-list');
    expect(setFlashMock).toHaveBeenCalledWith('message', 'Review status updated successfully.');
  });

  it('does not call updateReviewStatus for a non-numeric productId', async () => {
    requireAdminSessionMock.mockResolvedValue({ userId: 1, utype: 1, email: 'a@b.invalid' });
    const { GET } = await import('@/app/admin/update-review/[productId]/[reviewId]/[status]/route');

    const request = new NextRequest('http://localhost:3000/admin/update-review/abc/1/0');
    await GET(request, {
      params: Promise.resolve({ productId: 'abc', reviewId: '1', status: '0' }),
    });

    expect(updateReviewStatusMock).not.toHaveBeenCalled();
  });

  it('still redirects to review-list even when the ids are invalid (matches source\'s "quiet either way" posture)', async () => {
    requireAdminSessionMock.mockResolvedValue({ userId: 1, utype: 1, email: 'a@b.invalid' });
    const { GET } = await import('@/app/admin/update-review/[productId]/[reviewId]/[status]/route');

    const request = new NextRequest('http://localhost:3000/admin/update-review/abc/def/ghi');
    const response = await GET(request, {
      params: Promise.resolve({ productId: 'abc', reviewId: 'def', status: 'ghi' }),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin/review-list');
  });

  it('requires an admin session before doing anything', async () => {
    requireAdminSessionMock.mockResolvedValue({ userId: 1, utype: 1, email: 'a@b.invalid' });
    const { GET } = await import('@/app/admin/update-review/[productId]/[reviewId]/[status]/route');

    await GET(new NextRequest('http://localhost:3000/admin/update-review/5/1/0'), {
      params: Promise.resolve({ productId: '5', reviewId: '1', status: '0' }),
    });

    expect(requireAdminSessionMock).toHaveBeenCalled();
  });
});
