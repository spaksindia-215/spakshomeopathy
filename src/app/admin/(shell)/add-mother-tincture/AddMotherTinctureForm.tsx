'use client';

import { useActionState } from 'react';
import {
  createMotherTinctureProductAction,
  type MotherTinctureFormActionResult,
} from '@/lib/motherTincture/db/actions';
import type { Category } from '@/lib/mongodb/schemas';

const initialState: MotherTinctureFormActionResult | null = null;

export interface AddMotherTinctureFormProps {
  /** Real disease/category rows (`getCategoriesByType('N', 1)`) — the
   * same category tree `/homeopathy/products`' filter sidebar uses, so an
   * admin-added product's `pCat` actually matches a real, filterable
   * category rather than an invented one. */
  categories: Category[];
}

/**
 * Client-side form wrapper so `createMotherTinctureProductAction` can be
 * called via `useActionState` and its `persisted`/`message` result shown
 * inline — mirrors `@/app/admin/(shell)/add-herb/AddHerbForm.tsx` exactly
 * in structure. Kept separate from `page.tsx` (a server component) since
 * `useActionState` requires a Client Component.
 *
 * Fields cover the real `Product` schema's meaningful subset per the
 * task brief ("basic" form, not the full 10-variant-slot legacy admin
 * form): product name, category, price, MRP, quantity, rating, short
 * description, full description, image. A plain textarea is used for the
 * full description (no CKEditor) — matches `/admin/add-herb`'s own
 * plain-textarea description field.
 */
export function AddMotherTinctureForm({ categories }: AddMotherTinctureFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: MotherTinctureFormActionResult | null, formData: FormData) =>
      createMotherTinctureProductAction(formData),
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
          <label htmlFor="heading">Heading (optional — defaults to Product Name)</label>
          <input id="heading" name="heading" className="form-control" />
        </div>
      </div>
      <div className="row">
        <div className="col-md-4 form-group">
          <label htmlFor="categoryId">Category</label>
          <select id="categoryId" name="categoryId" className="form-control" defaultValue="">
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.legacyId} value={c.legacyId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4 form-group">
          <label htmlFor="rating">Rating (0-5)</label>
          <input
            id="rating"
            name="rating"
            type="number"
            min={0}
            max={5}
            step={1}
            className="form-control"
          />
        </div>
        <div className="col-md-4 form-group">
          <label htmlFor="quantity">Quantity (stock)</label>
          <input id="quantity" name="quantity" type="number" min={0} className="form-control" />
        </div>
      </div>
      <div className="row">
        <div className="col-md-6 form-group">
          <label htmlFor="price">Price (₹)</label>
          <input id="price" name="price" type="number" min={0} className="form-control" required />
        </div>
        <div className="col-md-6 form-group">
          <label htmlFor="mrp">MRP (₹)</label>
          <input id="mrp" name="mrp" type="number" min={0} className="form-control" />
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
          JPEG, PNG or WebP, up to 5MB.
        </p>
      </div>
      <div className="form-group">
        <label htmlFor="imagePath">Or: existing image filename (optional fallback)</label>
        <input
          id="imagePath"
          name="imagePath"
          className="form-control"
          placeholder="e.g. 1672657141gRhus-tox.png"
        />
        <p className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
          Used only if no file is uploaded above. Leave both empty to use placeholder art.
        </p>
      </div>
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Mother Tincture Medicine'}
      </button>
    </form>
  );
}
