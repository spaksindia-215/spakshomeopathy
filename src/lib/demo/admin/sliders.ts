/**
 * Admin Sliders demo-data accessors — backs `/admin/slider-list`,
 * `/admin/add-slider`, `/admin/edit-slider/[id]`.
 *
 * VERIFIED: 0 real rows in production (`schemas/slider.ts`'s own header;
 * re-confirmed by extracting the real dump this session) — matches the
 * already-registered P-18 finding that sliders are unused/disconnected
 * end-to-end (the homepage's banner is hardcoded static HTML, never
 * driven by this table). `/admin/slider-list` renders honestly empty by
 * default. Add/Edit are still built fully — a create form needs no
 * existing rows to demo, and Edit can be smoke-tested by first using Add
 * Slider's demo-only client-side action.
 */

import { DEMO_ADMIN_SLIDERS } from './sliders.generated';
import type { Slider } from '../../mongodb/schemas';

export function getAllAdminSliders(): Slider[] {
  return DEMO_ADMIN_SLIDERS;
}

export function getAdminSliderByLegacyId(legacyId: number): Slider | undefined {
  return DEMO_ADMIN_SLIDERS.find((s) => s.legacyId === legacyId);
}
