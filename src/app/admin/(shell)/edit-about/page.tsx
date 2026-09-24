import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getAboutPage } from '@/lib/about/repository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Admin Panel | Edit About Page',
};

/**
 * `/admin/edit-about` — GENUINELY NEW ADMIN SCREEN, no Laravel equivalent
 * (see `src/lib/about/schema.ts`'s header). Single-document editor, same
 * "no add/delete, edit-in-place" shape as `edit-page/[slug]` — there is
 * only ever one About row. Paragraph fields are edited as one paragraph
 * per line in a textarea and split on save (`update-about/route.ts`),
 * rather than a `CKEditorPlaceholder` blob, so each structural region
 * (heading, intro, subheading, secondary, clinic block, doctor block)
 * stays independently editable — see schema header for why About wasn't
 * folded into the generic `pages` HTML-blob CMS.
 */
export default async function AdminEditAboutPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.CONTENT_EDIT);

  const about = await getAboutPage(db);
  const csrfToken = generateCsrfToken();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Edit About Page</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit About Page</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-md-12">
            <div className="alert alert-info">
              For the paragraph fields below, put one paragraph per line — each
              line becomes a separate paragraph on the public About page.
            </div>
          </div>

          <form method="post" action="/admin/update-about">
            <input type="hidden" name="_token" value={csrfToken} />

            <div className="col-md-8">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Main Section</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="heading">Heading</label>
                    <input
                      type="text"
                      className="form-control"
                      id="heading"
                      name="heading"
                      defaultValue={about.heading}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="introParagraphs">Intro Paragraphs (one per line)</label>
                    <textarea
                      className="form-control"
                      id="introParagraphs"
                      name="introParagraphs"
                      rows={5}
                      defaultValue={about.introParagraphs.join('\n')}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="subheading">Subheading</label>
                    <input
                      type="text"
                      className="form-control"
                      id="subheading"
                      name="subheading"
                      defaultValue={about.subheading}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="secondaryParagraphs">Secondary Paragraphs (one per line)</label>
                    <textarea
                      className="form-control"
                      id="secondaryParagraphs"
                      name="secondaryParagraphs"
                      rows={5}
                      defaultValue={about.secondaryParagraphs.join('\n')}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="heroImage">
                      Image Path (relative, e.g. assets/images/about1.jpg)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="heroImage"
                      name="heroImage"
                      defaultValue={about.heroImage}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Clinic Details</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="clinicName">Clinic Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="clinicName"
                      name="clinicName"
                      defaultValue={about.clinicName}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="clinicAddress">Clinic Address</label>
                    <textarea
                      className="form-control"
                      id="clinicAddress"
                      name="clinicAddress"
                      rows={3}
                      defaultValue={about.clinicAddress}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="clinicPhone">Clinic Phone</label>
                    <input
                      type="text"
                      className="form-control"
                      id="clinicPhone"
                      name="clinicPhone"
                      defaultValue={about.clinicPhone}
                    />
                  </div>
                </div>
              </div>

              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Doctor &amp; Appointments</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="doctorName">Doctor Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="doctorName"
                      name="doctorName"
                      defaultValue={about.doctorName}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="doctorCredentials">Doctor Credentials</label>
                    <input
                      type="text"
                      className="form-control"
                      id="doctorCredentials"
                      name="doctorCredentials"
                      defaultValue={about.doctorCredentials}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="videoAppointmentUrl">Video Appointment Button URL</label>
                    <input
                      type="text"
                      className="form-control"
                      id="videoAppointmentUrl"
                      name="videoAppointmentUrl"
                      defaultValue={about.videoAppointmentUrl}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="clinicAppointmentUrl">In-Clinic Appointment Button URL</label>
                    <input
                      type="text"
                      className="form-control"
                      id="clinicAppointmentUrl"
                      name="clinicAppointmentUrl"
                      defaultValue={about.clinicAppointmentUrl}
                    />
                  </div>
                </div>
                <div className="box-footer">
                  <button type="submit" className="btn btn-success">
                    Save
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
