import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { SliderRepository } from '@/lib/mongodb/repositories/sliderRepository';
import { generateCsrfToken } from '@/lib/auth/csrf';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/edit-slider/[id]` — ported from `admin/edit-slider.blade.php`
 * (175 lines), `AdminController@EditSlider` (GET) / `UpdateSlider`
 * (POST, to `admin/update-slider`).
 *
 * M5-E: switched from `@/lib/demo/admin`'s static fixture to a live
 * `spaks_dev` read (`SliderRepository.findByLegacyId`), CSRF-token-wired,
 * success flash rendered. D-04 RESOLVED this slice (Fix Register
 * FIX-003) — see `src/lib/uploads/adminUpload.ts`'s header.
 *
 * Reachable only by directly visiting a URL with an id, since
 * `slider-list` typically has zero/few real rows to link an edit action
 * from — kept buildable/demoable on its own for completeness, per the
 * milestone's List+Create+Edit+View requirement for every named module.
 *
 * FLAGSHIP PRESERVED STRUCTURAL DEFECT, confirmed directly this session:
 * the right column has TWO adjacent `.box-body` divs (source lines 109
 * and 115) — the Image file input sits in the first, then a SECOND
 * `.box-body` opens (never properly closing the first one's semantic
 * boundary) containing "Previous Image", Status, and Submit. Both are
 * still nested inside the same outer `.box`. Reproduced structurally as
 * two literal sibling `.box-body` divs, not merged into one.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Edit Slider',
};

export default async function AdminEditSliderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const legacyId = Number(id);

  const db = await getDb();
  const repo = new SliderRepository(db);
  const slider = Number.isFinite(legacyId) ? await repo.findByLegacyId(legacyId) : null;

  if (!slider) {
    notFound();
  }

  const csrfToken = generateCsrfToken();
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/bootstrap/dist/css/bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Edit Slider</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Edit Slider</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-success">{message}</div>}
          <form method="post" action="/admin/update-slider" encType="multipart/form-data">
            <input type="hidden" name="_token" value={csrfToken} />
            <input type="hidden" name="slider_id" value={slider.legacyId} />
            <input type="hidden" name="old_image" value={slider.sliderImage} />

            <div className="col-md-6">
              <div className="box box-success">
                <div className="box-header with-border">
                  <h3 className="box-title">Slider Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Slider Title</label>
                    <input
                      type="text"
                      name="slider_title"
                      className="form-control"
                      placeholder="Enter Slider Title"
                      defaultValue={slider.sliderTitle}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Slider Subtitle</label>
                    <input
                      type="text"
                      name="slider_subtitle"
                      className="form-control"
                      placeholder="Enter Subtitle"
                      defaultValue={slider.sliderSubtitle}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="box box-info">
                <div className="box-header with-border">
                  <h3 className="box-title">Slider Info</h3>
                </div>
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Image</label>
                    <input type="file" name="slider_image" className="form-control" />
                  </div>
                </div>

                {/* PRESERVED DEFECT: a SECOND sibling .box-body, structurally
                    unmerged with the one above — see file header. */}
                <div className="box-body">
                  <div className="form-group">
                    <label htmlFor="exampleInputEmail1">Previous Image</label>
                    <img
                      src={`/uploaded_files/slider/${slider.sliderImage}`}
                      height={80}
                      width={80}
                      alt=""
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="exampleInputPassword1">Status</label>
                    <select
                      className="form-control"
                      name="slider_status"
                      required
                      defaultValue={slider.sliderStatus}
                    >
                      <option value="">--Select--</option>
                      <option value="1">Active</option>
                      <option value="0">Inactive</option>
                    </select>
                  </div>

                  <div className="box-footer">
                    <button type="submit" name="submit" className="btn btn-success">
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
