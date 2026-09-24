/**
 * `sliders` data access. See `schemas/slider.ts`'s header — P-18 (admin
 * maintained the table but the homepage never read it) is now resolved:
 * `findActiveDescending()` below is read by `RedesignedHome.tsx`'s promo
 * banner section, the real homepage.
 */

import type { Db } from 'mongodb';
import { ValidatedRepository } from './base';
import { COLLECTIONS } from '../collections';
import { sliderSchema, type Slider } from '../schemas';

export class SliderRepository extends ValidatedRepository<Slider> {
  constructor(db: Db) {
    super(db, COLLECTIONS.sliders, sliderSchema);
  }

  /** Mirrors `AdminController::SliderList` — `orderBy('id','desc')`. */
  async findAllDescending(): Promise<Slider[]> {
    const docs = await this.find({});
    return [...docs].sort((a, b) => b.legacyId - a.legacyId);
  }

  /** Site Settings feature addition: active (`sliderStatus === 1`) sliders
   * only, newest first — what the homepage promo banner renders. Not a
   * Laravel-mirrored method (no public consumer existed in source, see
   * this file's header), so no controller to cite. */
  async findActiveDescending(): Promise<Slider[]> {
    const docs = await this.findAllDescending();
    return docs.filter((doc) => doc.sliderStatus === 1);
  }

  /** Mirrors `AdminController::EditSlider` — `WHERE id = $id`. */
  async findByLegacyId(legacyId: number): Promise<Slider | null> {
    return this.findOne({ legacyId });
  }

  /** Mirrors `AdminController::SaveSlider`'s insert. */
  async insertSlider(doc: Slider): Promise<Slider> {
    return this.insertOne(doc);
  }

  /** Mirrors `AdminController::UpdateSlider`'s update. */
  async updateSlider(
    legacyId: number,
    fields: Partial<Omit<Slider, 'legacyId' | 'createdAt'>>
  ): Promise<void> {
    await this.updateOne({ legacyId }, fields as Partial<Slider>);
  }

  /** Mirrors `AdminController::DestroySlider`'s delete. */
  async deleteSlider(legacyId: number): Promise<void> {
    await this.deleteOne({ legacyId });
  }
}
