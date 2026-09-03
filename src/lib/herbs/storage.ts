/**
 * Small localStorage helpers shared by the Herbs Store's cart, wishlist,
 * and recently-viewed state (see `HerbsStoreProvider`).
 *
 * Per CR-003 §10.5: this project has no functioning cart today (the
 * legacy `AddToCartForm`/`CartPageContent` are non-wired UI shells — see
 * that component's own header — and there is no session/cart package in
 * this Next.js app at all). Rather than pretend to "integrate" with
 * something that does not functionally exist, the Herbs Store gets its
 * own genuinely working, clearly-scoped client-side cart, namespaced
 * under `spaks-herbs-*` keys so it never collides with anything else.
 *
 * Guest-only persistence (localStorage) is used throughout; the original
 * brief's note about database persistence "for authenticated users if the
 * existing architecture supports it" does not apply — this app has no
 * working session-backed cart/wishlist to extend (see above).
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

export const HERBS_CART_KEY = 'spaks-herbs-cart';
export const HERBS_WISHLIST_KEY = 'spaks-herbs-wishlist';
export const HERBS_RECENTLY_VIEWED_KEY = 'spaks-herbs-recently-viewed';
