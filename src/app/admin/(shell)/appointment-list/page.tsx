import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { getAdminAppointmentsView } from '@/lib/services/adminAppointmentService';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { readAndClearFlash } from '@/lib/auth/flash';

/**
 * `/admin/appointment-list` — CR-006 Phase 3. Ported from
 * `admin/manage-appointment.blade.php`, `AdminController@ManageAppointment`
 * (`AdminController.php:1371-1377`).
 *
 * READ-ONLY: no Action column — source has none (confirmed: no
 * status-change route exists for appointments anywhere in
 * `routes/admin.php`). Not adding one here either.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Appointment List',
};

export default async function AdminAppointmentListPage() {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.ORDERS_VIEW);

  const appointments = await getAdminAppointmentsView(db);
  const message = await readAndClearFlash('message');

  return (
    <>
      <AdminStylesheets />
      <link
        rel="stylesheet"
        href="/admin-assets/bower_components/datatables.net-bs/css/dataTables.bootstrap.min.css"
      />

      <section className="content-header">
        <h1>Appointment List</h1>
        <ol className="breadcrumb">
          <li>
            <a href="#">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Appointment List</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          {message !== null && <div className="alert alert-danger">{message}</div>}
          <div className="col-xs-12">
            <div className="box">
              <div className="box-body">
                <table id="example2" className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Name</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Phone</th>
                      <th>Date</th>
                      <th>Consultant Hour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt, i) => (
                      <tr key={appt.legacyId}>
                        <td>{i + 1}</td>
                        <td>{appt.name}</td>
                        <td>{appt.age}</td>
                        <td>{appt.gender}</td>
                        <td>{appt.phone}</td>
                        <td>{appt.appointmentDate}</td>
                        <td>{appt.consultantHour}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
$(function () {
  $('#example2').DataTable({
    paging: true,
    lengthChange: false,
    searching: false,
    ordering: true,
    info: true,
    autoWidth: false
  });
});
`,
        }}
      />
    </>
  );
}
