'use client';

import { useActionState } from 'react';
import {
  createCosmeticsProductAction,
  type CosmeticsFormActionResult,
} from '@/lib/cosmetics/db/actions';
import type { Category } from '@/lib/mongodb/schemas';

const initialState: CosmeticsFormActionResult | null = null;

export interface AddCosmeticsFormProps {
  /** Real disease/category rows (`getCategoriesByType('N', 1)`) — same
   * dropdown source `AddMotherTinctureForm` uses, so an admin-added
   * product's `pCat` matches a real category rather than an invented one.
   * Optional here since Cosmetics categorization is looser than Mother
   * Tincture's. */
  categories: Category[];
}

/**
 * Client-side form wrapper so `createCosmeticsProductAction` can be
 * called via `useActionState` and its `persisted`/`message` result shown
 * inline — mirrors `@/app/admin/(shell)/add-mother-tincture/AddMotherTinctureForm.tsx`
 * exactly in structure and field set, plus a Status select (Mother
 * Tincture's form hardcodes `pStatus: 1`; this one lets an admin save a
 * cosmetics product as inactive/draft).
 */
export function AddCosmeticsForm({ categories }: AddCosmeticsFormProps) {
  const [state, formAction, isPending] = useActionState(
    async (_prev: CosmeticsFormActionResult | null, formData: FormData) =>
      createCosmeticsProductAction(formData),
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
        <div className="col-md-3 form-group">
          <label htmlFor="categoryId">Category (optional)</label>
          <select id="categoryId" name="categoryId" className="form-control" defaultValue="">
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.legacyId} value={c.legacyId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-3 form-group">
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
        <div className="col-md-3 form-group">
          <label htmlFor="quantity">Quantity (stock)</label>
          <input id="quantity" name="quantity" type="number" min={0} className="form-control" />
        </div>
        <div className="col-md-3 form-group">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" className="form-control" defaultValue="1">
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
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
          placeholder="e.g. 1672657141gcream.png"
        />
        <p className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
          Used only if no file is uploaded above. Leave both empty to use placeholder art.
        </p>
      </div>
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Cosmetics Product'}
      </button>
    </form>
  );
}
