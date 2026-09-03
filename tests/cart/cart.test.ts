/**
 * Session-cart tests — M5.
 *
 * LABEL: UNIT + FIXTURE, same pattern as `tests/auth/session.test.ts`:
 * `next/headers`'s `cookies()` only works inside a real Next.js request
 * context, so these tests mock it with an in-memory cookie jar to exercise
 * the real `src/lib/cart.ts` add/remove/update/subtotal logic end-to-end
 * through its public API — not a real HTTP request, not a real browser.
 *
 * Covers the blueprint §7.2 / M5 testing-checklist items that are pure
 * cart-cookie logic (not DB-dependent): re-add increments quantity,
 * distinct-line-count badge (P-08), remove, absolute-quantity update,
 * subtotal computation, and empty-cart deletion of the cookie.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const cookieJar = new Map<string, { value: string }>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
    set: (name: string, value: string) => {
      cookieJar.set(name, { value });
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

vi.mock('../../src/lib/env', () => ({
  getCryptoConfig: () => ({
    appKey: 'base64:test-key-not-real',
    sessionSecret: 'test-session-secret-for-unit-tests-only',
    sessionLifetimeMinutes: 120,
  }),
}));

function makeItem(
  overrides: {
    id?: number;
    price?: number;
    quantity?: number;
    name?: string;
  } = {}
) {
  return {
    id: overrides.id ?? 101,
    price: overrides.price ?? 250,
    quantity: overrides.quantity ?? 1,
    name: overrides.name ?? 'Test Product',
    attributes: {
      image: 'test.jpg',
      image2: '',
      image3: '',
      image4: '',
      image5: '',
      image6: '',
      image7: '',
      image8: '',
      image9: '',
      image10: '',
      name2: '',
      name3: '',
      name4: '',
      name5: '',
      name6: '',
      name7: '',
      name8: '',
      name9: '',
      name10: '',
      uid: '5',
    },
  };
}

describe('cart (UNIT + FIXTURE — mocked next/headers cookie jar)', () => {
  beforeEach(() => {
    cookieJar.clear();
    vi.resetModules();
  });

  it('returns an empty array when no cart cookie is present', async () => {
    const { getCartContent } = await import('@/lib/cart');
    expect(await getCartContent()).toEqual([]);
  });

  it('addToCart adds a new line for a new product id', async () => {
    const { addToCart, getCartContent } = await import('@/lib/cart');
    await addToCart(makeItem({ id: 101 }));

    const content = await getCartContent();
    expect(content).toHaveLength(1);
    expect(content[0]?.id).toBe(101);
    expect(content[0]?.quantity).toBe(1);
  });

  it('re-adding the SAME product id INCREMENTS quantity, does not add a second line (darryldecode/cart semantics, blueprint §7.2)', async () => {
    const { addToCart, getCartContent } = await import('@/lib/cart');
    await addToCart(makeItem({ id: 101, quantity: 1 }));
    await addToCart(makeItem({ id: 101, quantity: 1 }));

    const content = await getCartContent();
    expect(content).toHaveLength(1); // still ONE line
    expect(content[0]?.quantity).toBe(2); // incremented, not replaced
  });

  it('adding a DIFFERENT product id creates a second, independent line', async () => {
    const { addToCart, getCartContent } = await import('@/lib/cart');
    await addToCart(makeItem({ id: 101 }));
    await addToCart(makeItem({ id: 202, price: 99, name: 'Other Product' }));

    const content = await getCartContent();
    expect(content).toHaveLength(2);
    expect(content.map((i) => i.id).sort()).toEqual([101, 202]);
  });

  it('re-add does NOT overwrite price/name/attributes of the existing line (package only updates quantity)', async () => {
    const { addToCart, getCartContent } = await import('@/lib/cart');
    await addToCart(makeItem({ id: 101, price: 250, name: 'Test Product' }));
    // Same id, but a caller submitting different price/name — source's
    // StoreCart always sends quantity=1 and the SAME product fields on a
    // genuine re-add, but this test isolates that the package itself would
    // never apply a changed price/name even if a caller passed one.
    await addToCart(makeItem({ id: 101, price: 999, name: 'Changed Name' }));

    const content = await getCartContent();
    expect(content).toHaveLength(1);
    expect(content[0]?.price).toBe(250); // untouched
    expect(content[0]?.name).toBe('Test Product'); // untouched
    expect(content[0]?.quantity).toBe(2); // only this changed
  });

  it('getTotalCartItem returns DISTINCT LINE COUNT, not summed quantity (P-08)', async () => {
    const { addToCart, getCartContent, getTotalCartItem } = await import('@/lib/cart');
    await addToCart(makeItem({ id: 101, quantity: 1 }));
    await addToCart(makeItem({ id: 101, quantity: 1 })); // increments to quantity=2, still 1 line
    await addToCart(makeItem({ id: 202, quantity: 5 })); // a second line, quantity=5

    const content = await getCartContent();
    // 2 distinct lines (ids 101, 202), even though total quantity is 2+5=7
    expect(getTotalCartItem(content)).toBe(2);
  });

  it('getSubTotal sums price * quantity across all lines', async () => {
    const { getSubTotal } = await import('@/lib/cart');
    const content = [
      makeItem({ id: 101, price: 250, quantity: 2 }), // 500
      makeItem({ id: 202, price: 99, quantity: 3 }), // 297
    ];
    expect(getSubTotal(content)).toBe(797);
  });

  it('removeFromCart removes only the matching line', async () => {
    const { addToCart, removeFromCart, getCartContent } = await import('@/lib/cart');
    await addToCart(makeItem({ id: 101 }));
    await addToCart(makeItem({ id: 202 }));

    await removeFromCart(101);
    const content = await getCartContent();
    expect(content).toHaveLength(1);
    expect(content[0]?.id).toBe(202);
  });

  it('removeFromCart on the LAST line empties the cart AND deletes the cookie', async () => {
    const { addToCart, removeFromCart, getCartContent, CART_COOKIE_NAME } = await import(
      '@/lib/cart'
    );
    await addToCart(makeItem({ id: 101 }));
    expect(cookieJar.has(CART_COOKIE_NAME)).toBe(true);

    await removeFromCart(101);
    expect(await getCartContent()).toEqual([]);
    expect(cookieJar.has(CART_COOKIE_NAME)).toBe(false);
  });

  it('updateCartQuantity sets an ABSOLUTE quantity, not relative (CartController::update)', async () => {
    const { addToCart, updateCartQuantity, getCartContent } = await import('@/lib/cart');
    await addToCart(makeItem({ id: 101, quantity: 1 }));

    await updateCartQuantity(101, 7);
    const content = await getCartContent();
    expect(content[0]?.quantity).toBe(7); // set to 7, not 1+7

    await updateCartQuantity(101, 3);
    const content2 = await getCartContent();
    expect(content2[0]?.quantity).toBe(3); // set to 3, not 7+3
  });

  it('updateCart is the same function as updateCartQuantity (CartController::UpdateCart — same absolute semantics)', async () => {
    const { updateCart, updateCartQuantity } = await import('@/lib/cart');
    expect(updateCart).toBe(updateCartQuantity);
  });

  it('rejects a tampered cart cookie (signature mismatch) — returns empty content, not a crash', async () => {
    const { addToCart, getCartContent, CART_COOKIE_NAME } = await import('@/lib/cart');
    await addToCart(makeItem({ id: 101 }));

    const original = cookieJar.get(CART_COOKIE_NAME)!.value;
    const [, signature] = original.split('.');
    const forgedContent = Buffer.from(
      JSON.stringify([{ ...makeItem({ id: 999, price: 0 }) }])
    ).toString('base64url');
    cookieJar.set(CART_COOKIE_NAME, { value: `${forgedContent}.${signature}` });

    expect(await getCartContent()).toEqual([]);
  });

  it('quantity <= 0 passed through unmodified (source performs no floor/validation)', async () => {
    const { addToCart, updateCartQuantity, getCartContent } = await import('@/lib/cart');
    await addToCart(makeItem({ id: 101, quantity: 1 }));
    await updateCartQuantity(101, -3);

    const content = await getCartContent();
    expect(content[0]?.quantity).toBe(-3);
  });
});
