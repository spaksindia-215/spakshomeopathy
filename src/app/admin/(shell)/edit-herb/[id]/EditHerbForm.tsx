'use client';

import { useActionState } from 'react';
import { HERB_FORM_CATEGORIES, WELLNESS_CATEGORIES } from '@/lib/herbs/data/taxonomy';
import { updateHerbProductAction, type HerbFormActionResult } from '@/lib/herbs/db/actions';
import { isRealImagePath } from '@/components/herbs/HerbArt';
import type { HerbProduct } from '@/lib/herbs/types';
import { getLeadVariant } from '@/lib/herbs/types';

const initialState: HerbFormActionResult | null = null;

export function EditHerbForm({ herb }: { herb: HerbProduct }) {
  const lead = getLeadVariant(herb);
  const boundAction = updateHerbProductAction.bind(null, herb.id, herb.image);
  const [state, formAction, isPending] = useActionState(
    async (_prev: HerbFormActionResult | null, formData: FormData) => boundAction(formData),
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
          <input id="name" name="name" className="form-control" defaultValue={herb.name} required />
        </div>
        <div className="col-md-6 form-group">
          <label htmlFor="sku">SKU</label>
          <input id="sku" name="sku" className="form-control" defaultValue={herb.sku} />
        </div>
      </div>
      <div className="row">
        <div className="col-md-4 form-group">
          <label htmlFor="form">Herb Form</label>
          <select id="form" name="form" className="form-control" defaultValue={herb.form}>
            {HERB_FORM_CATEGORIES.map((c) => (
              <option key={c.form} value={c.form}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4 form-group">
          <label htmlFor="wellness">Wellness Category</label>
          <select
            id="wellness"
            name="wellness"
            className="form-control"
            defaultValue={herb.wellnessCategories[0]}
          >
            {WELLNESS_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4 form-group">
          <label htmlFor="botanicalName">Botanical Name</label>
          <input
            id="botanicalName"
            name="botanicalName"
            className="form-control"
            defaultValue={herb.botanicalName ?? ''}
          />
        </div>
      </div>
      <div className="row">
        <div className="col-md-4 form-group">
          <label htmlFor="price">Price (₹)</label>
          <input
            id="price"
            name="price"
            type="number"
            className="form-control"
            defaultValue={lead?.price}
            required
          />
        </div>
        <div className="col-md-4 form-group">
          <label htmlFor="compareAtPrice">Compare-at Price (₹)</label>
          <input
            id="compareAtPrice"
            name="compareAtPrice"
            type="number"
            className="form-control"
            defaultValue={lead?.compareAtPrice}
          />
        </div>
        <div className="col-md-4 form-group">
          <label htmlFor="stock">Stock</label>
          <input
            id="stock"
            name="stock"
            type="number"
            className="form-control"
            defaultValue={herb.stock}
            required
          />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="shortDescription">Short Description</label>
        <textarea
          id="shortDescription"
          name="shortDescription"
          className="form-control"
          rows={2}
          defaultValue={herb.shortDescription}
        />
      </div>
      <div className="form-group">
        <label htmlFor="description">Full Description</label>
        <textarea
          id="description"
          name="description"
          className="form-control"
          rows={4}
          defaultValue={herb.description}
        />
      </div>
      <div className="row">
        <div className="col-md-4 form-group">
          <label>
            <input type="checkbox" name="featured" defaultChecked={herb.featured} /> Featured
          </label>
        </div>
        <div className="col-md-4 form-group">
          <label>
            <input type="checkbox" name="bestseller" defaultChecked={herb.bestseller} /> Bestseller
          </label>
        </div>
        <div className="col-md-4 form-group">
          <label>
            <input type="checkbox" name="newArrival" defaultChecked={herb.newArrival} /> New Arrival
          </label>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="image">Product Image</label>
        {isRealImagePath(herb.image) && (
          <div style={{ marginBottom: 8 }}>
            <img
              src={herb.image}
              alt={herb.name}
              style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4 }}
            />
          </div>
        )}
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="form-control"
        />
        <p className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
          JPEG, PNG or WebP, up to 5MB. Leave empty to keep the current image.
        </p>
      </div>
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}
