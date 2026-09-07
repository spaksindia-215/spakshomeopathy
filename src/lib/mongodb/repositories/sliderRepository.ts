/**
 * `sliders` data access. See `schemas/slider.ts`'s header for P-18
 * (maintained by admin, unused by the homepage — this repository does not
 * change that; nothing here is ever read by any public-facing page).
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
