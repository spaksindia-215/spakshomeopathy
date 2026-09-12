'use client';

/**
 * Homeopathy Store client state: cart, wishlist, and the Quick View
 * modal's open/target state. Recreated from the Herbs Store's
 * `HerbsStoreProvider.tsx` (same shape, same reasoning: guest-only,
 * localStorage-backed, one provider because the pieces are small and
 * many components need them simultaneously) so Add to Cart on
 * `/homeopathy/**` behaves EXACTLY like it does on `/herbs/**` — instant,
 * client-side, no page reload — per the owner's explicit request.
 *
 * Deliberately separate from the real session cart
 * (`@/lib/cartActions`/`/product-store-cart`, still used by the legacy
 * `/products` and `/details` pages via `AddToCartForm`) — this store
 * never reads or writes that mechanism, mirroring the Herbs Store's own
 * "does not touch any existing cart/session mechanism" scoping.
 *
 * The real `Product` schema (`@/lib/mongodb/schemas`) has no per-product
 * variant concept (unlike the Herbs Store's `HerbVariant[]` — one size/
 * price per medicine), so a cart line here is one row per product, keyed
 * by `Product.legacyId` directly rather than a `(productId, variantLabel)`
 * pair.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Product } from '@/lib/mongodb/schemas';
import {
  HOMEOPATHY_CART_KEY,
  HOMEOPATHY_WISHLIST_KEY,
  readJSON,
  writeJSON,
} from '@/lib/homeopathy/storage';

export interface HomeopathyCartLine {
  productId: number; // Product.legacyId
  productSlug: string;
  productName: string;
  image: string | null;
  unitPrice: number;
  compareAtPrice?: number;
  quantity: number;
}

interface QuickViewState {
  product: Product | null;
}

interface HomeopathyStoreContextValue {
  cart: HomeopathyCartLine[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  setCartQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;

  wishlist: number[];
  isWishlisted: (productId: number) => boolean;
  toggleWishlist: (productId: number) => void;

  quickView: QuickViewState;
  openQuickView: (product: Product) => void;
  closeQuickView: () => void;

  /** "<Product> added to cart" confirmation message, or `null` when no
   * toast should show — set by `addToCart`, read by `<Toast>` (rendered
   * once from `HomeopathyShell`) so every add-to-cart entry point
   * (product card, Quick View, PDP) gets the same confirmation without
   * each needing its own toast state. */
  toastMessage: string | null;
  dismissToast: () => void;
}

const HomeopathyStoreContext = createContext<HomeopathyStoreContextValue | null>(null);

export function HomeopathyStoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<HomeopathyCartLine[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Hydrate from localStorage once, client-side only (avoids SSR/client
  // markup mismatch — server always renders the empty-state shape).
  useEffect(() => {
    setCart(readJSON(HOMEOPATHY_CART_KEY, []));
    setWishlist(readJSON(HOMEOPATHY_WISHLIST_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeJSON(HOMEOPATHY_CART_KEY, cart);
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) writeJSON(HOMEOPATHY_WISHLIST_KEY, wishlist);
  }, [wishlist, hydrated]);

  // Auto-dismiss whatever toast is currently showing after a few seconds;
  // cleared and restarted on every new `addToCart` call (rapid successive
  // adds each get the full display duration for their own message) and
  // on unmount, so a stale timer never fires after the provider is gone.
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(null);
  }, []);

  const addToCart = useCallback((product: Product, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.legacyId);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.legacyId ? { ...l, quantity: l.quantity + quantity } : l
        );
      }
      const line: HomeopathyCartLine = {
        productId: product.legacyId,
        productSlug: product.pSlug ?? '',
        productName: product.pName || product.pHeading,
        image: product.pBestimg,
        unitPrice: product.pPrice ?? 0,
        ...(product.pMrp && product.pMrp > (product.pPrice ?? 0)
          ? { compareAtPrice: product.pMrp }
          : {}),
        quantity,
      };
      return [...prev, line];
    });

    const name = product.pName || product.pHeading || 'Item';
    setToastMessage(`${name} added to cart`);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const setCartQuantity = useCallback((productId: number, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) => (l.productId === productId ? { ...l, quantity } : l));
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((productId: number) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const isWishlisted = useCallback(
    (productId: number) => wishlist.includes(productId),
    [wishlist]
  );

  const openQuickView = useCallback((product: Product) => setQuickViewProduct(product), []);
  const closeQuickView = useCallback(() => setQuickViewProduct(null), []);

  const cartCount = useMemo(() => cart.reduce((sum, l) => sum + l.quantity, 0), [cart]);
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [cart]
  );

  const value: HomeopathyStoreContextValue = {
    cart,
    cartCount,
    cartSubtotal,
    addToCart,
    removeFromCart,
    setCartQuantity,
    clearCart,
    wishlist,
    isWishlisted,
    toggleWishlist,
    quickView: { product: quickViewProduct },
    openQuickView,
    closeQuickView,
    toastMessage,
    dismissToast,
  };

  return (
    <HomeopathyStoreContext.Provider value={value}>{children}</HomeopathyStoreContext.Provider>
  );
}

export function useHomeopathyStore(): HomeopathyStoreContextValue {
  const ctx = useContext(HomeopathyStoreContext);
  if (!ctx) {
    throw new Error('useHomeopathyStore must be used within <HomeopathyStoreProvider>');
  }
  return ctx;
}
