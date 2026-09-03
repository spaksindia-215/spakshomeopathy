'use client';

/**
 * Herbs Store client state: cart, wishlist, recently-viewed, and the
 * Quick View modal's open/target state. One provider because all four are
 * small, related, guest-only (localStorage-backed) pieces of state that
 * many Herbs components need simultaneously (header cart badge, product
 * cards, PDP, cart page) — splitting into four separate context providers
 * would not reduce coupling, only add boilerplate re-imports everywhere.
 *
 * Scope: Herbs Store only. Does not touch, read, or write any existing
 * cart/session/auth mechanism in this app (CR-003 §10.3/§10.4).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { HerbProduct, HerbVariant } from '@/lib/herbs/types';
import {
  HERBS_CART_KEY,
  HERBS_RECENTLY_VIEWED_KEY,
  HERBS_WISHLIST_KEY,
  readJSON,
  writeJSON,
} from '@/lib/herbs/storage';

export interface CartLine {
  productId: string;
  productSlug: string;
  productName: string;
  image: string;
  variantLabel: string;
  unitPrice: number;
  compareAtPrice?: number;
  quantity: number;
}

interface QuickViewState {
  product: HerbProduct | null;
}

interface HerbsStoreContextValue {
  cart: CartLine[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (product: HerbProduct, variant: HerbVariant, quantity: number) => void;
  removeFromCart: (productId: string, variantLabel: string) => void;
  setCartQuantity: (productId: string, variantLabel: string, quantity: number) => void;
  clearCart: () => void;

  wishlist: string[];
  isWishlisted: (productId: string) => boolean;
  toggleWishlist: (productId: string) => void;

  recentlyViewed: string[];
  recordView: (productId: string) => void;

  quickView: QuickViewState;
  openQuickView: (product: HerbProduct) => void;
  closeQuickView: () => void;
}

const HerbsStoreContext = createContext<HerbsStoreContextValue | null>(null);

const RECENTLY_VIEWED_LIMIT = 8;

export function HerbsStoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<HerbProduct | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once, client-side only (avoids SSR/client
  // markup mismatch — server always renders the empty-state shape).
  useEffect(() => {
    setCart(readJSON(HERBS_CART_KEY, []));
    setWishlist(readJSON(HERBS_WISHLIST_KEY, []));
    setRecentlyViewed(readJSON(HERBS_RECENTLY_VIEWED_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeJSON(HERBS_CART_KEY, cart);
  }, [cart, hydrated]);
  useEffect(() => {
    if (hydrated) writeJSON(HERBS_WISHLIST_KEY, wishlist);
  }, [wishlist, hydrated]);
  useEffect(() => {
    if (hydrated) writeJSON(HERBS_RECENTLY_VIEWED_KEY, recentlyViewed);
  }, [recentlyViewed, hydrated]);

  const addToCart = useCallback((product: HerbProduct, variant: HerbVariant, quantity: number) => {
    setCart((prev) => {
      const existing = prev.find(
        (l) => l.productId === product.id && l.variantLabel === variant.label
      );
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id && l.variantLabel === variant.label
            ? { ...l, quantity: l.quantity + quantity }
            : l
        );
      }
      const line: CartLine = {
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        image: product.image,
        variantLabel: variant.label,
        unitPrice: variant.price,
        ...(variant.compareAtPrice ? { compareAtPrice: variant.compareAtPrice } : {}),
        quantity,
      };
      return [...prev, line];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, variantLabel: string) => {
    setCart((prev) =>
      prev.filter((l) => !(l.productId === productId && l.variantLabel === variantLabel))
    );
  }, []);

  const setCartQuantity = useCallback(
    (productId: string, variantLabel: string, quantity: number) => {
      setCart((prev) => {
        if (quantity <= 0) {
          return prev.filter(
            (l) => !(l.productId === productId && l.variantLabel === variantLabel)
          );
        }
        return prev.map((l) =>
          l.productId === productId && l.variantLabel === variantLabel ? { ...l, quantity } : l
        );
      });
    },
    []
  );

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }, []);

  const isWishlisted = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  const recordView = useCallback((productId: string) => {
    setRecentlyViewed((prev) =>
      [productId, ...prev.filter((id) => id !== productId)].slice(0, RECENTLY_VIEWED_LIMIT)
    );
  }, []);

  const openQuickView = useCallback((product: HerbProduct) => setQuickViewProduct(product), []);
  const closeQuickView = useCallback(() => setQuickViewProduct(null), []);

  const cartCount = useMemo(() => cart.reduce((sum, l) => sum + l.quantity, 0), [cart]);
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    [cart]
  );

  const value: HerbsStoreContextValue = {
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
    recentlyViewed,
    recordView,
    quickView: { product: quickViewProduct },
    openQuickView,
    closeQuickView,
  };

  return <HerbsStoreContext.Provider value={value}>{children}</HerbsStoreContext.Provider>;
}

export function useHerbsStore(): HerbsStoreContextValue {
  const ctx = useContext(HerbsStoreContext);
  if (!ctx) {
    throw new Error('useHerbsStore must be used within <HerbsStoreProvider>');
  }
  return ctx;
}
