import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { PublicScripts } from '@/components/layout/PublicScripts';
import { PublicStylesheets } from '@/components/layout/PublicStylesheets';
import { readAndClearFlash } from '@/lib/auth/flash';
import { generateCsrfToken } from '@/lib/auth/csrf';

/**
 * `/consultancy` — ported from `consultancy.blade.php` (138 lines),
 * `HomeController@Consultancy` (`HomeController.php:97-103`).
 *
 * Source `SaveAppointment` (the form's action target) performs NO
 * validation at all — see `src/lib/services/appointmentService.ts`'s own
 * header from the earlier M4-PREP phase for the full citation.
 *
 * M5-A: `/save-appointment` (src/app/save-appointment/route.ts) now really
 * inserts into `spaks_dev.appointments`. The `session()->has('message')`
 * block below is wired to the same one-shot flash cookie as
 * `/login`/`/register`/`/contact`, same `alert-success` markup as source
 * (`consultancy.blade.php:40-44`). `$errors` bag not wired — same
 * disclosed gap as every other form in this app.
 *
 * M5-B: added the `_token` hidden field, wired to `csrf.ts` (source has
 * `@csrf` here — `consultancy.blade.php:47`, confirmed directly this
 * slice) — `save-appointment/route.ts` now verifies it.
 *
 * Uses `.datepicker` (bootstrap-datepicker) — already in
 * `LegacyScriptRunner`'s fixed script list, no extra script needed.
 */
export const metadata: Metadata = {
  title: 'Spakshomeopathy - Consultancy',
  other: {
    'msapplication-TileColor': '#ffffff',
    'theme-color': '#ffffff',
  },
};

export default async function ConsultancyPage() {
  const message = await readAndClearFlash('message');
  const csrfToken = generateCsrfToken();

  return (
    <div className="page-wrapper">
      <PublicStylesheets />
      <PublicHeader />
      <hr />
      <br />
      <br />
      <br />
      <br />
      <section className="appointment-one appointment-one__appointment-page">
        <div className="container">
          <div className="inner-container">
            <h3 className="appointment-one__title">Get an Appointment</h3>

            {message !== null && <div className="alert alert-success">{message}</div>}

            <form action="/save-appointment" method="post">
              <input type="hidden" name="_token" value={csrfToken} />
              <div className="row align-items-end">
                <div className="col-xl-5 col-lg-6">
                  <label className="appointment-one__label">Full Name</label>
                  <div className="appointment-one__form-group">
                    <div className="appointment-one__icon">
                      <i className="material-icons">person</i>
                    </div>
                    <input
                      type="text"
                      name="name"
                      className="appointment-one__field"
                      placeholder="Full name"
                    />
                  </div>
                </div>
                <div className="col-xl-4 col-lg-6">
                  <label className="appointment-one__label">Age</label>
                  <div className="appointment-one__form-group">
                    <div className="appointment-one__icon">
                      <i className="material-icons">date_range</i>
                    </div>
                    <input
                      type="number"
                      name="age"
                      className="appointment-one__field"
                      placeholder="Enter your age"
                    />
                  </div>
                </div>
                <div className="col-xl-3 col-lg-6">
                  <label className="appointment-one__label">Gender</label>
                  <div className="appointment-one__form-group">
                    <div className="">
                      <select className="form-control" name="gender">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-xl-5 col-lg-6">
                  <label className="appointment-one__label">Phone Number</label>
                  <div className="appointment-one__form-group">
                    <div className="appointment-one__icon">
                      <i className="material-icons">phone</i>
                    </div>
                    <input
                      type="text"
                      name="phone"
                      className="appointment-one__field"
                      placeholder="Enter number"
                    />
                  </div>
                </div>
                <div className="col-xl-4 col-lg-6">
                  <label className="appointment-one__label">Appointment Date</label>
                  <div className="appointment-one__form-group">
                    <div className="appointment-one__icon">
                      <i className="material-icons">date_range</i>
                    </div>
                    <input
                      type="text"
                      name="appointment_date"
                      className="appointment-one__field datepicker"
                      placeholder="Set a date"
                    />
                  </div>
                </div>
                <div className="col-xl-3 col-lg-6">
                  <label className="appointment-one__label">Consultant Hour</label>
                  <div className="appointment-one__form-group">
                    <div className="">
                      <select className="form-control" name="consultant_hour">
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="col-xl-3 col-lg-12">
                  <button type="submit" className="thm-btn">
                    Submit Request
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      <PublicFooter />
      <PublicScripts />
    </div>
  );
}
