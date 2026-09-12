'use client';

import { Toast } from './HomeopathyUI';
import { useHomeopathyStore } from './HomeopathyStoreProvider';

/**
 * Renders the "<Product> added to cart" toast when
 * `useHomeopathyStore().toastMessage` is set — a small client wrapper so
 * `HomeopathyShell` itself doesn't need `'use client'` just to read this
 * one piece of state.
 */
export function CartToast() {
  const { toastMessage, dismissToast } = useHomeopathyStore();
  if (!toastMessage) return null;
  return <Toast message={toastMessage} onClose={dismissToast} />;
}
