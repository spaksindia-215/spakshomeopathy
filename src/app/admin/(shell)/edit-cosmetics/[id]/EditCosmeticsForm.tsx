'use client';

import { useActionState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateCosmeticsProductAction,
  deleteCosmeticsProductAction,
  type CosmeticsFormActionResult,
} from '@/lib/cosmetics/db/actions';
import type { Category, Product } from '@/lib/mongodb/schemas';

const initialState: CosmeticsFormActionResult | null = null;

export interface EditCosmeticsFormProps {
  product: Product;
  categories: Category[];
}

/**
 * Edit/delete counterpart to `AddCosmeticsForm.tsx` — same field set and
 * `useActionState` pattern, pre-filled with the existing product's
 * values. `updateCosmeticsProductAction` is bound with the product's
 * `legacyId`/current image so the form itself only ever submits the
 * fields a user can actually change (same "keep existing unless
 * replaced" image convention `update-slider`/`update-disease` use
 * elsewhere in this admin panel).
 */
export function EditCosmeticsForm({ product, categories }: EditCosmeticsFormProps) {
  const router = useRouter();
  const [isDeleting, startDeleteTransition] = useTransition();
  const boundUpdate = updateCosmeticsProductAction.bind(
    null,
    product.legacyId,
    product.pBestimg
  );
  const [state, formAction, isPending] = useActionState(
    async (_prev: CosmeticsFormActionResult | null, formData: FormData) => boundUpdate(formData),
    initialState
  );

  function handleDelete() {
    if (!window.confirm('Delete this cosmetics product? This cannot be undone.')) return;
    startDeleteTransition(async () => {
      const result = await deleteCosmeticsProductAction(product.legacyId);
      if (result.persisted) {
        router.push('/admin/cosmetics-list');
      } else {
        window.alert(result.message);
      }
    });
  }

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
          <input
            id="name"
            name="name"
            className="form-control"
            defaultValue={product.pName ?? ''}
            required
          />
        </div>
        <div className="col-md-6 form-group">
          <label htmlFor="heading">Heading (shown separately on the product card — update if you change Name)</label>
          <input id="heading" name="heading" className="form-control" defaultValue={product.pHeading ?? ''} />
        </div>
      </div>
      <div className="row">
        <div className="col-md-3 form-group">
          <label htmlFor="categoryId">Category (optional)</label>
          <select
            id="categoryId"
            name="categoryId"
            className="form-control"
            defaultValue={product.pCat ?? ''}
          >
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
            defaultValue={product.pRating ?? ''}
          />
        </div>
        <div className="col-md-3 form-group">
          <label htmlFor="quantity">Quantity (stock)</label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={0}
            className="form-control"
            defaultValue={product.pQuantity ?? ''}
          />
        </div>
        <div className="col-md-3 form-group">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" className="form-control" defaultValue={product.pStatus ?? 1}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      </div>
      <div className="row">
        <div className="col-md-6 form-group">
          <label htmlFor="price">Price (₹)</label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            className="form-control"
            defaultValue={product.pPrice ?? ''}
            required
          />
        </div>
        <div className="col-md-6 form-group">
          <label htmlFor="mrp">MRP (₹)</label>
          <input
            id="mrp"
            name="mrp"
            type="number"
            min={0}
            className="form-control"
            defaultValue={product.pMrp ?? ''}
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
          defaultValue={product.pShortDesc ?? ''}
        />
      </div>
      <div className="form-group">
        <label htmlFor="description">Full Description</label>
        <textarea
          id="description"
          name="description"
          className="form-control"
          rows={4}
          defaultValue={product.pDesc ?? ''}
        />
      </div>
      {product.pBestimg && (
        <div className="form-group">
          <label>Current Image</label>
          <br />
          <img src={`/uploaded_files/products/${product.pBestimg}`} height={80} width={80} alt="" />
        </div>
      )}
      <div className="form-group">
        <label htmlFor="image">Replace Image (leave blank to keep current)</label>
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
        <input id="imagePath" name="imagePath" className="form-control" placeholder="e.g. 1672657141gcream.png" />
      </div>
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Changes'}
      </button>{' '}
      <button
        type="button"
        className="btn btn-danger"
        disabled={isDeleting}
        onClick={handleDelete}
      >
        {isDeleting ? 'Deleting…' : 'Delete'}
      </button>
    </form>
  );
}
