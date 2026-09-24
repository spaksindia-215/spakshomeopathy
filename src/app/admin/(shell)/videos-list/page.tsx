import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { VideoRepository } from '@/lib/videos/repository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

export const metadata: Metadata = {
  title: 'Admin Panel | Videos List',
};

/**
 * `/admin/videos-list` — GENUINELY NEW ADMIN SCREEN, no Laravel
 * equivalent (see `src/lib/videos/schema.ts`'s header).
 */
export default async function AdminVideosListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_VIEW);

  const repo = new VideoRepository(db);
  const videos = await repo.findAllDescending();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Videos List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Videos List</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Title</th>
                      <th>YouTube Video ID</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map((video, i) => (
                      <tr key={video.legacyId}>
                        <td>{i + 1}</td>
                        <td>{video.title}</td>
                        <td>{video.youtubeVideoId}</td>
                        <td>{video.status === 1 ? 'Active' : 'Inactive'}</td>
                        <td>
                          <Link href={`/admin/edit-video/${video.legacyId}`}>
                            <i className="fa fa-pencil btn btn-info btn-sm"></i>
                          </Link>{' '}
                          <a href={`/admin/destroy-video/${video.legacyId}`}>
                            <i className="fa fa-trash btn btn-danger btn-sm"></i>
                          </a>
                        </td>
                      </tr>
                    ))}
                    {videos.length === 0 && (
                      <tr>
                        <td colSpan={5}>No videos added yet.</td>
                      </tr>
                    )}
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
