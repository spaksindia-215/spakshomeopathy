'use client';

import { useActionState } from 'react';
import { HERB_FORM_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import { createHerbProductAction, type HerbFormActionResult } from '@/lib/herbs/db/actions';

const initialState: HerbFormActionResult | null = null;

interface WellnessOption {
  key: string;
  label: string;
}

/**
 * Client-side form wrapper so `createHerbProductAction` can be called via
 * `useActionState` and its `persisted`/`message` result shown inline,
 * instead of the page's previous fake `e.preventDefault()` + `alert()`
 * demo script. Kept separate from `page.tsx` (a server component) since
 * `useActionState` requires a Client Component.
 *
 * `wellnessCategories` is passed in by the server-component page (DB-backed
 * list when configured, `WELLNESS_CATEGORIES` static fallback otherwise —
 * CR-006 Phase 6) rather than imported directly, so this form never needs
 * to know which source it came from.
 */
export function AddHerbForm({ wellnessCategories }: { wellnessCategories: WellnessOption[] }) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: HerbFormActionResult | null, formData: FormData) =>
      createHerbProductAction(formData),
    initialState
  );

  return (
    <form action={formAction}>
      {state && (
        <div
          className={`alert ${state.persisted ? 'alert-success' : 'alert-warning'}`}
          role="status"
        >
          {state.message}
        </div>
      )}
      <div className="row">
        <div className="col-md-6 form-group">
          <label htmlFor="name">Product Name</label>
          <input id="name" name="name" className="form-control" required />
        </div>
        <div className="col-md-6 form-group">
          <label htmlFor="sku">SKU</label>
          <input id="sku" name="sku" className="form-control" />
        </div>
      </div>
      <div className="row">
        <div className="col-md-4 form-group">
          <label htmlFor="form">Herb Form</label>
          <select id="form" name="form" className="form-control">
            {HERB_FORM_CATEGORIES.map((c) => (
              <option key={c.form} value={c.form}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4 form-group">
          <label htmlFor="botanicalName">Botanical Name</label>
          <input id="botanicalName" name="botanicalName" className="form-control" />
        </div>
      </div>
      <div className="form-group">
        <label>Wellness Categories</label>
        <div>
          {wellnessCategories.map((c) => (
            <label key={c.key} style={{ display: 'inline-block', marginRight: 16 }}>
              <input type="checkbox" name="wellness" value={c.key} /> {c.label}
            </label>
          ))}
        </div>
      </div>
      <div className="row">
        <div className="col-md-4 form-group">
          <label htmlFor="price">Price (₹)</label>
          <input id="price" name="price" type="number" className="form-control" required />
        </div>
        <div className="col-md-4 form-group">
          <label htmlFor="compareAtPrice">Compare-at Price (₹)</label>
          <input id="compareAtPrice" name="compareAtPrice" type="number" className="form-control" />
        </div>
        <div className="col-md-4 form-group">
          <label htmlFor="stock">Stock</label>
          <input id="stock" name="stock" type="number" className="form-control" required />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="shortDescription">Short Description</label>
        <textarea id="shortDescription" name="shortDescription" className="form-control" rows={2} />
      </div>
      <div className="form-group">
        <label htmlFor="description">Full Description</label>
        <textarea id="description" name="description" className="form-control" rows={4} />
      </div>
      <div className="row">
        <div className="col-md-4 form-group">
          <label>
            <input type="checkbox" name="featured" /> Featured
          </label>
        </div>
        <div className="col-md-4 form-group">
          <label>
            <input type="checkbox" name="bestseller" /> Bestseller
          </label>
        </div>
        <div className="col-md-4 form-group">
          <label>
            <input type="checkbox" name="newArrival" /> New Arrival
          </label>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="image">Product Image</label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="form-control"
        />
        <p className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
          JPEG, PNG or WebP, up to 5MB. Leave empty to use placeholder art, same as the seed
          catalogue.
        </p>
      </div>
      <div className="row">
        <div className="col-md-6 form-group">
          <label htmlFor="metaTitle">SEO Title</label>
          <input id="metaTitle" name="metaTitle" className="form-control" />
          <p className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            Leave empty to auto-generate as &quot;{'{Product Name}'} | Spaks Herbs&quot;.
          </p>
        </div>
        <div className="col-md-6 form-group">
          <label htmlFor="metaDescription">SEO Description</label>
          <textarea id="metaDescription" name="metaDescription" className="form-control" rows={2} />
          <p className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            Leave empty to reuse the Short Description above.
          </p>
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Herb Product'}
      </button>
    </form>
  );
}
