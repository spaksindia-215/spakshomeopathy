/**
 * `statezones` data access.
 *
 * Mirrors `HomeController::Checkout`'s `DB::table('statezones')->get()`
 * (`HomeController.php:399`) — the checkout page's State `<select>` options
 * (`cart-checkout.blade.php:258-262`'s `@foreach($getstatezone as $statezone)`).
 * No filter, no ordering clause in source — reproduced as an unfiltered,
 * unsorted `find({})`, matching source exactly (a bare `->get()` with no
 * `orderBy()`/`where()` chained).
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { statezoneSchema, type Statezone } from '../schemas';

export class StatezoneRepository extends ValidatedRepository<Statezone> {
  constructor(db: Db) {
    super(db, COLLECTIONS.statezones, statezoneSchema);
  }

  /** Mirrors `DB::table('statezones')->get()` — every row, source order
   * (insertion/natural order; source applies no `orderBy()`). */
  async findAll(): Promise<Statezone[]> {
    return this.find({});
  }
}
