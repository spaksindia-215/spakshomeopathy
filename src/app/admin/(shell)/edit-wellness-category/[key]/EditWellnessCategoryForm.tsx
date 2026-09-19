'use client';

import { useActionState } from 'react';
import {
  updateWellnessCategoryAction,
  type HerbFormActionResult,
} from '@/lib/herbs/db/actions';
import type { WellnessCategoryDoc } from '@/lib/herbs/db/wellnessCategorySchema';

const initialState: HerbFormActionResult | null = null;

export function EditWellnessCategoryForm({ category }: { category: WellnessCategoryDoc }) {
  const boundAction = updateWellnessCategoryAction.bind(null, category.key, category.createdAt);
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
          <label htmlFor="label">Label</label>
          <input
            id="label"
            name="label"
            className="form-control"
            defaultValue={category.label}
            required
          />
          <p className="text-muted" style={{ fontSize: 11.5, marginTop: 4 }}>
            Key: <code>{category.key}</code> (not editable — referenced by existing herb tags).
          </p>
        </div>
        <div className="col-md-3 form-group">
          <label htmlFor="icon">Icon</label>
          <input id="icon" name="icon" className="form-control" defaultValue={category.icon} />
        </div>
        <div className="col-md-3 form-group">
          <label htmlFor="sortOrder">Sort Order</label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            className="form-control"
            defaultValue={category.sortOrder}
          />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          className="form-control"
          rows={2}
          defaultValue={category.description}
        />
      </div>
      <div className="form-group">
        <label htmlFor="status">Status</label>
        <select id="status" name="status" className="form-control" defaultValue={category.status}>
          <option value="active">Active</option>
          <option value="hidden">Hidden</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}
