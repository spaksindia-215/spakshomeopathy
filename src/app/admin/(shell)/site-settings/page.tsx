import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getSiteSettings } from '@/lib/settings/repository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Admin Panel | Site Settings',
};

/**
 * `/admin/site-settings` — GENUINELY NEW ADMIN SCREEN, no Laravel
 * equivalent: production's header/footer/contact page hardcode this
 * content directly in Blade markup (see `src/lib/settings/schema.ts`'s
 * header). Single-document editor, same "no add/delete, edit-in-place"
 * shape as `edit-page/[slug]` — there is only ever one settings row.
 *
 * Uses `PERMISSIONS.SETTINGS_VIEW`/`SETTINGS_UPDATE`, reserved for exactly
 * this in `src/lib/auth/permissions.ts`'s Phase 9 "System" group but
 * unused by any route until now.
 */
export default async function AdminSiteSettingsPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.SETTINGS_VIEW);

  const settings = await getSiteSettings(db);
  const csrfToken = generateCsrfToken();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Site Settings</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Site Settings</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <div className="col-md-12">
            <div className="alert alert-info">
              These values drive the header, footer, and Contact Us page across the
              public site. Leaving a field blank is allowed but will show as blank on the
              site — clear a field only if you mean to remove that text.
            </div>
          </div>

          <form method="post" action="/admin/update-settings">
            <input type="hidden" name="_token" value={csrfToken} />

            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Contact Details</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="companyName">Company Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="companyName"
                      name="companyName"
                      defaultValue={settings.companyName}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contactEmail">Contact Email</label>
                    <input
                      type="email"
                      className="form-control"
                      id="contactEmail"
                      name="contactEmail"
                      defaultValue={settings.contactEmail}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contactPhone">Contact Phone (as displayed)</label>
                    <input
                      type="text"
                      className="form-control"
                      id="contactPhone"
                      name="contactPhone"
                      defaultValue={settings.contactPhone}
                      placeholder="+91 8700458818"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contactPhoneDialable">
                      Contact Phone (digits only, used for the tap-to-call link)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="contactPhoneDialable"
                      name="contactPhoneDialable"
                      defaultValue={settings.contactPhoneDialable}
                      placeholder="8700458818"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="address">Address</label>
                    <textarea
                      className="form-control"
                      id="address"
                      name="address"
                      rows={2}
                      defaultValue={settings.address}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Footer</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="footerAboutText">Footer About Text</label>
                    <textarea
                      className="form-control"
                      id="footerAboutText"
                      name="footerAboutText"
                      rows={3}
                      defaultValue={settings.footerAboutText}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="copyrightText">Copyright Text</label>
                    <input
                      type="text"
                      className="form-control"
                      id="copyrightText"
                      name="copyrightText"
                      defaultValue={settings.copyrightText}
                    />
                  </div>
                </div>
              </div>

              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Social Links</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="facebookUrl">Facebook URL</label>
                    <input
                      type="text"
                      className="form-control"
                      id="facebookUrl"
                      name="facebookUrl"
                      defaultValue={settings.facebookUrl}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="instagramUrl">Instagram URL</label>
                    <input
                      type="text"
                      className="form-control"
                      id="instagramUrl"
                      name="instagramUrl"
                      defaultValue={settings.instagramUrl}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="youtubeUrl">YouTube URL</label>
                    <input
                      type="text"
                      className="form-control"
                      id="youtubeUrl"
                      name="youtubeUrl"
                      defaultValue={settings.youtubeUrl}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="twitterUrl">Twitter URL (blank hides the icon)</label>
                    <input
                      type="text"
                      className="form-control"
                      id="twitterUrl"
                      name="twitterUrl"
                      defaultValue={settings.twitterUrl}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pinterestUrl">Pinterest URL (blank hides the icon)</label>
                    <input
                      type="text"
                      className="form-control"
                      id="pinterestUrl"
                      name="pinterestUrl"
                      defaultValue={settings.pinterestUrl}
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
