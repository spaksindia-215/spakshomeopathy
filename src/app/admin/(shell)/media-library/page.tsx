import type { Metadata } from 'next';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { uploadedFilesRoot } from '@/lib/uploads/adminUpload';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';
import { getDb } from '@/lib/mongodb/client';

interface Props {
  searchParams: Promise<{ dir?: string }>;
}

/**
 * `/admin/media-library` — CR-006 Phase 8
 * (`docs/CR-006-PHASE-8-PLAN.md` §2.1). GENUINELY NEW, NO LARAVEL
 * EQUIVALENT: no Media/Gallery/FileManager controller exists in source
 * — see `src/lib/uploads/adminUpload.ts`'s header for the upload
 * plumbing this screen reuses without duplicating.
 *
 * FILESYSTEM SCAN, NOT A DATABASE INDEX (owner decision, 2026-09-15):
 * lists whatever `readdir`/`stat` finds under
 * `uploaded_files/{subdirectory}/` at REQUEST TIME — always accurate to
 * what's actually on disk, with no separate index that could drift out
 * of sync. The trade-off, disclosed on-screen and in
 * `delete-media-file/[subdirectory]/[filename]/route.ts`'s own header:
 * this screen has no reverse index of which product/category/post/
 * slider document, if any, still references a given filename.
 *
 * SUBDIRECTORY LIST: hardcoded to the 6 directories confirmed present
 * under `public/uploaded_files/` this phase (`products`, `categories`,
 * `post`, `slider`, `product-categories`, `profile`) — NOT the Herbs
 * Store's own separate upload tree (`src/lib/herbs/uploads/`), which is
 * CR-003's parallel model with its own upload root, out of this
 * migration's `uploaded_files/` scope.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Media Library',
};

const SUBDIRECTORIES = [
  'products',
  'categories',
  'post',
  'slider',
  'product-categories',
  'profile',
] as const;

interface FileEntry {
  name: string;
  sizeBytes: number;
  modifiedAt: Date;
}

async function listFiles(subdirectory: string): Promise<FileEntry[]> {
  const dirPath = join(uploadedFilesRoot(), subdirectory);
  try {
    const names = await readdir(dirPath);
    const entries = await Promise.all(
      names.map(async (name) => {
        const stats = await stat(join(dirPath, name));
        return { name, sizeBytes: stats.size, modifiedAt: stats.mtime };
      })
    );
    return entries.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  } catch {
    // Directory doesn't exist (e.g. a subdirectory with zero uploads so
    // far) — an empty list, not an error, same "quiet either way"
    // posture as this codebase's other filesystem reads.
    return [];
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminMediaLibraryPage({ searchParams }: Props) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.MEDIA_MANAGE);

  const { dir } = await searchParams;
  const activeDir = SUBDIRECTORIES.includes(dir as (typeof SUBDIRECTORIES)[number])
    ? (dir as (typeof SUBDIRECTORIES)[number])
    : SUBDIRECTORIES[0];

  const files = await listFiles(activeDir);
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Media Library</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Media Library</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && (
            <div className="col-xs-12">
              <div className="alert alert-success">{message}</div>
            </div>
          )}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-header">
                <ul className="nav nav-pills">
                  {SUBDIRECTORIES.map((sd) => (
                    <li key={sd} className={sd === activeDir ? 'active' : ''}>
                      <a href={`/admin/media-library?dir=${sd}`}>{sd}</a>
                    </li>
                  ))}
                </ul>
                <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#888' }}>
                  {files.length} file(s) in <code>uploaded_files/{activeDir}/</code>. This screen
                  reads the filesystem directly — it does not know whether a file is still
                  referenced by a live product, category, post, or slider before you delete it.
                </p>
              </div>
              <div className="box-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '8%' }}>S.No</th>
                      <th style={{ width: '15%' }}>Preview</th>
                      <th style={{ width: '40%' }}>Filename</th>
                      <th style={{ width: '15%' }}>Size</th>
                      <th style={{ width: '15%' }}>Modified</th>
                      <th style={{ width: '7%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file, i) => (
                      <tr key={file.name}>
                        <td>{i + 1}</td>
                        <td>
                          <img
                            src={`/uploaded_files/${activeDir}/${file.name}`}
                            style={{ height: '50px', width: '50px', objectFit: 'cover' }}
                            alt=""
                          />
                        </td>
                        <td>
                          <a
                            href={`/uploaded_files/${activeDir}/${file.name}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {file.name}
                          </a>
                        </td>
                        <td>{formatSize(file.sizeBytes)}</td>
                        <td>{file.modifiedAt.toLocaleString()}</td>
                        <td>
                          <a
                            href={`/admin/delete-media-file/${activeDir}/${encodeURIComponent(file.name)}`}
                          >
                            <i className="fa fa-trash btn btn-danger btn-sm"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
