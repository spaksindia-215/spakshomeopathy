'use client';

import { useActionState } from 'react';
import { HERB_FORM_CATEGORIES, WELLNESS_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import { createHerbProductAction, type HerbFormActionResult } from '@/lib/herbs/db/actions';

const initialState: HerbFormActionResult | null = null;

/**
 * Client-side form wrapper so `createHerbProductAction` can be called via
 * `useActionState` and its `persisted`/`message` result shown inline,
 * instead of the page's previous fake `e.preventDefault()` + `alert()`
 * demo script. Kept separate from `page.tsx` (a server component) since
 * `useActionState` requires a Client Component.
 */
export function AddHerbForm() {
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
          <label htmlFor="wellness">Wellness Category</label>
          <select id="wellness" name="wellness" className="form-control">
            {WELLNESS_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
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
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Herb Product'}
      </button>
    </form>
  );
}
