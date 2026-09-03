'use client';

import { useTransition } from 'react';
import { deleteHerbProductAction } from '@/lib/herbs/db/actions';

/**
 * Delete control for a DB-backed (`source: 'db'`) row in `/admin/herbs-list`
 * only — seed-data rows use the existing demo confirm()/alert() script
 * (see that page's own script block) since they have no database document
 * to actually delete.
 */
export function DeleteHerbButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteHerbProductAction(id);
      window.alert(result.message);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      style={{ background: 'none', border: 'none', padding: 0 }}
      aria-label={`Delete ${name}`}
    >
      <i
        className={`fa ${isPending ? 'fa-spinner fa-spin' : 'fa-trash'} btn btn-danger btn-sm`}
      ></i>
    </button>
  );
}
