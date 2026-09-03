/**
 * Visual stand-in for CKEditor 4.7.3 ("standard" build, loaded from
 * `https://cdn.ckeditor.com/4.7.3/standard/ckeditor.js` in source —
 * confirmed exact version/URL this session).
 *
 * Real, CONFIRMED bindings in source (6 total, all verified directly
 * against `public_html/` this session):
 *   - `add-post.blade.php` / `edit-post.blade.php` → field `post_desc`
 *   - `add-blog.blade.php` / `edit-blog.blade.php` → field `blog_desc`
 *   - `add-product.blade.php` / `edit-product.blade.php` → field `p_desc`
 * (Category's `add-category.blade.php`/`edit-category.blade.php` also
 * carry a `CKEDITOR.replace('p_desc')` script, but that page has no
 * `p_desc` field at all — a dead/copy-pasted script in source, not
 * reproduced here since there's no real binding to stand in for.)
 *
 * ============================================================================
 * DOES NOT LOAD OR EXECUTE THE REAL CKEDITOR 4.7.3 ENGINE — DELIBERATE,
 * PER OWNER INSTRUCTION (M4-DEMO Phase 1, 2026-08-21: "If running the
 * actual editor requires functionality outside this milestone, a visually
 * equivalent controlled area is acceptable, but document it.")
 * ============================================================================
 * This is a real, name-addressable `<textarea>` (not a `contentEditable`
 * div — deliberately: a textarea works with native form submission and
 * SSR `defaultValue` pre-fill with zero client-side state wiring, exactly
 * matching what a Server Component page needs for Edit-page pre-fill,
 * consistent with every other form field in this migration), styled with
 * a static toolbar row above it that reproduces CKEditor 4's default
 * "standard" toolbar groupings closely enough to read as authentic at a
 * glance. The toolbar buttons are NOT wired to any editing behavior —
 * they are inert chrome, not a reimplemented rich-text engine (which
 * would be exactly the kind of "new frontend architecture" the owner's
 * instruction forbids introducing for this milestone).
 */

export interface CKEditorPlaceholderProps {
  /** The real Laravel field name this textarea must submit under
   * (post_desc / blog_desc / p_desc) — preserved so a future real
   * integration can bind to the identical name. */
  name: string;
  id?: string;
  defaultValue?: string;
  required?: boolean;
}

const TOOLBAR_GROUPS: { label: string; icons: string[] }[] = [
  { label: 'Source', icons: ['fa-code'] },
  { label: 'Clipboard', icons: ['fa-cut', 'fa-copy', 'fa-paste'] },
  { label: 'Undo', icons: ['fa-undo', 'fa-repeat'] },
  { label: 'Basic Styles', icons: ['fa-bold', 'fa-italic', 'fa-underline', 'fa-strikethrough'] },
  { label: 'Paragraph', icons: ['fa-list-ul', 'fa-list-ol', 'fa-outdent', 'fa-indent'] },
  { label: 'Links', icons: ['fa-link', 'fa-unlink'] },
  { label: 'Insert', icons: ['fa-image', 'fa-table', 'fa-file'] },
  { label: 'Styles', icons: ['fa-font'] },
];

export function CKEditorPlaceholder({
  name,
  id,
  defaultValue,
  required,
}: CKEditorPlaceholderProps) {
  return (
    <div className="cke_chrome" style={{ border: '1px solid #d1d5db', borderRadius: '2px' }}>
      {/* Inert toolbar chrome — not wired to any editing behavior. See file header. */}
      <div
        className="cke_top"
        style={{
          padding: '6px 8px',
          borderBottom: '1px solid #d1d5db',
          background: '#fafafa',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {TOOLBAR_GROUPS.map((group) => (
          <span key={group.label} style={{ display: 'inline-flex', gap: '4px' }}>
            {group.icons.map((icon) => (
              <i
                key={icon}
                className={`fa ${icon}`}
                aria-hidden="true"
                style={{
                  width: '22px',
                  height: '22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#555',
                  cursor: 'default',
                }}
              />
            ))}
          </span>
        ))}
      </div>
      <textarea
        name={name}
        id={id}
        defaultValue={defaultValue}
        required={required}
        className="form-control"
        style={{
          width: '100%',
          minHeight: '200px',
          border: 'none',
          borderRadius: 0,
          padding: '10px',
          resize: 'vertical',
        }}
      />
    </div>
  );
}
