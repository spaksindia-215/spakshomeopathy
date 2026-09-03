/**
 * `handleStoreCart` tests — mirrors `CartController::StoreCart`
 * (`CartController.php:76-291`).
 *
 * LABEL: UNIT + FIXTURE. Mocks `@/lib/cart` (`addToCart`), `@/lib/
 * mongodb/client` (`getDb`), `@/lib/cartOrderId` (`generateCartOrderId`),
 * and `@/lib/cartOrderIdCookie` (`setCartOrderId`) — isolates the FIELD
 * PARSING logic (the exact thing `CartController::StoreCart`'s 100+ lines
 * of `if ($req->p_imageN != '') ... else ''` ladder does) from cart-cookie
 * and DB behavior, which have their own dedicated tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const addToCartMock = vi.fn(async (item: unknown) => [item]);
const setCartOrderIdMock = vi.fn(async (_id: string) => undefined);

vi.mock('@/lib/cart', () => ({
  addToCart: (item: unknown) => addToCartMock(item),
}));

vi.mock('@/lib/mongodb/client', () => ({
  getDb: async () => ({}),
}));

vi.mock('@/lib/cartOrderId', () => ({
  generateCartOrderId: async () => '1234567',
}));

vi.mock('@/lib/cartOrderIdCookie', () => ({
  setCartOrderId: (id: string) => setCartOrderIdMock(id),
}));

describe('handleStoreCart (UNIT + FIXTURE)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses id/uid/p_name/p_price and hardcodes quantity=1 (CartController.php:240)', async () => {
    const { handleStoreCart } = await import('@/lib/cartActions');
    const params = new URLSearchParams({
      id: '101',
      uid: '5',
      p_name: 'Ashwagandha',
      p_price: '250',
      p_image: 'ashwagandha.jpg',
    });

    await handleStoreCart(params);

    expect(addToCartMock).toHaveBeenCalledTimes(1);
    const item = addToCartMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(item.id).toBe(101);
    expect(item.price).toBe(250);
    expect(item.quantity).toBe(1);
    expect(item.name).toBe('Ashwagandha');
    expect((item.attributes as Record<string, unknown>).uid).toBe('5');
    expect((item.attributes as Record<string, unknown>).image).toBe('ashwagandha.jpg');
  });

  it('defaults every empty/absent pN_image/pN_name slot to "" (CartController.php\'s if/else ladder)', async () => {
    const { handleStoreCart } = await import('@/lib/cartActions');
    const params = new URLSearchParams({ id: '1', p_price: '10' }); // everything else absent

    await handleStoreCart(params);

    const item = addToCartMock.mock.calls[0]![0] as Record<string, unknown>;
    const attrs = item.attributes as Record<string, unknown>;
    expect(attrs.image2).toBe('');
    expect(attrs.image9).toBe('');
    expect(attrs.name2).toBe('');
    expect(attrs.name9).toBe('');
  });

  it('PRESERVED DEFECT: image10 slot is populated only when p_image (not p_image10) is non-empty (CartController.php:150-155)', async () => {
    const { handleStoreCart } = await import('@/lib/cartActions');

    // p_image EMPTY, p_image10 present -> image10 should stay '' (the bug:
    // the condition checks p_image, not p_image10).
    const params1 = new URLSearchParams({ id: '1', p_price: '10', p_image10: 'slot10.jpg' });
    await handleStoreCart(params1);
    const item1 = addToCartMock.mock.calls[0]![0] as Record<string, unknown>;
    expect((item1.attributes as Record<string, unknown>).image10).toBe('');

    vi.clearAllMocks();

    // p_image NON-EMPTY, p_image10 present -> image10 IS populated (because
    // the buggy condition on p_image passed, not because p_image10 itself
    // was checked).
    const params2 = new URLSearchParams({
      id: '1',
      p_price: '10',
      p_image: 'primary.jpg',
      p_image10: 'slot10.jpg',
    });
    await handleStoreCart(params2);
    const item2 = addToCartMock.mock.calls[0]![0] as Record<string, unknown>;
    expect((item2.attributes as Record<string, unknown>).image10).toBe('slot10.jpg');
  });

  it('PRESERVED DEFECT: name10 slot is populated only when p_name (not p_name10) is non-empty (CartController.php:224-229)', async () => {
    const { handleStoreCart } = await import('@/lib/cartActions');

    const params1 = new URLSearchParams({ id: '1', p_price: '10', p_name10: 'Slot Ten' }); // p_name absent
    await handleStoreCart(params1);
    const item1 = addToCartMock.mock.calls[0]![0] as Record<string, unknown>;
    expect((item1.attributes as Record<string, unknown>).name10).toBe('');

    vi.clearAllMocks();

    const params2 = new URLSearchParams({
      id: '1',
      p_price: '10',
      p_name: 'Primary Name',
      p_name10: 'Slot Ten',
    });
    await handleStoreCart(params2);
    const item2 = addToCartMock.mock.calls[0]![0] as Record<string, unknown>;
    expect((item2.attributes as Record<string, unknown>).name10).toBe('Slot Ten');
  });

  it('generates and stores a getOrderId (CartController.php:283-286), returns it', async () => {
    const { handleStoreCart } = await import('@/lib/cartActions');
    const params = new URLSearchParams({ id: '1', p_price: '10' });

    const result = await handleStoreCart(params);

    expect(result.orderId).toBe('1234567');
    expect(setCartOrderIdMock).toHaveBeenCalledWith('1234567');
  });

  it('works identically whether given FormData (POST body) or URLSearchParams (GET query)', async () => {
    const { handleStoreCart } = await import('@/lib/cartActions');
    const fd = new FormData();
    fd.set('id', '55');
    fd.set('p_price', '75');
    fd.set('p_name', 'Formy');

    await handleStoreCart(fd);

    const item = addToCartMock.mock.calls[0]![0] as Record<string, unknown>;
    expect(item.id).toBe(55);
    expect(item.price).toBe(75);
    expect(item.name).toBe('Formy');
  });
});
