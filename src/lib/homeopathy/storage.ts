/**
 * Small localStorage helpers shared by the Homeopathy Store's cart and
 * wishlist client state (see `HomeopathyStoreProvider`).
 *
 * Recreated verbatim from the Herbs Store's `@/lib/herbs/storage.ts` (same
 * guest-only localStorage approach, same reasoning), just namespaced under
 * `spaks-homeopathy-*` keys instead of `spaks-herbs-*` so the two stores'
 * client state never collides. This is INTENTIONALLY separate from the
 * real session cart the legacy `/product-store-cart` route reads/writes
 * (`AddToCartForm`, `@/lib/cartActions`) — the owner asked for the
 * Homeopathy Store's add-to-cart interaction to match the Herbs Store's
 * (instant, client-side, no page reload, no MongoDB round trip), which
 * means it needs the same kind of store the Herbs Store has, not a
 * "fix" of the legacy server-cart form.
 */

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — fail silently,
    // the in-memory React state still works for the current page load.
  }
}

export const HOMEOPATHY_CART_KEY = 'spaks-homeopathy-cart';
export const HOMEOPATHY_WISHLIST_KEY = 'spaks-homeopathy-wishlist';
