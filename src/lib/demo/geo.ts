/**
 * Statezone demo-data accessors. See products.ts's header for the
 * general rationale. Full real table (36 rows, small) — used by
 * `/register`'s state dropdown and the checkout form's state select.
 */

import { DEMO_STATEZONES } from './statezones.generated';
import type { Statezone } from '../mongodb/schemas';

export function getAllStatezones(): Statezone[] {
  return DEMO_STATEZONES;
}
