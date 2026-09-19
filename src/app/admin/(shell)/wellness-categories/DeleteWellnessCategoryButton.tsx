'use client';

import { useTransition } from 'react';
import { hideWellnessCategoryAction } from '@/lib/herbs/db/actions';

/**
 * Hide control for a DB-backed row in `/admin/wellness-categories`.
 * Soft-delete only (`status: 'hidden'`) — see
 * `WellnessCategoryRepository.hide`'s header for why this project
 * doesn't hard-delete categories that existing herb documents may still
 * reference. Same `useTransition` + `window.confirm`/`alert` shape as
 * `herbs-list/DeleteHerbButton.tsx`.
 */
export function DeleteWellnessCategoryButton({ label, wellKey }: { label: string; wellKey: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(`Hide "${label}" from the public wellness page and admin picker?`)) return;
    startTransition(async () => {
      const result = await hideWellnessCategoryAction(wellKey);
      window.alert(result.message);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      style={{ background: 'none', border: 'none', padding: 0 }}
      aria-label={`Hide ${label}`}
    >
      <i
        className={`fa ${isPending ? 'fa-spinner fa-spin' : 'fa-eye-slash'} btn btn-danger btn-sm`}
      ></i>
    </button>
  );
}
