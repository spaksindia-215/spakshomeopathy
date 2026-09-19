import type { Metadata } from 'next';
import { AdminStylesheets } from '@/components/admin/AdminStylesheets';
import { getDb } from '@/lib/mongodb/client';
import { AuditLogRepository } from '@/lib/audit/repository';
import { requireAdminSession } from '@/lib/auth/guard';
import { requirePermissionForSession } from '@/lib/auth/rbac-guard';
import { PERMISSIONS } from '@/lib/auth/permissions';

interface Props {
  searchParams: Promise<{ collection?: string; actor?: string }>;
}

/**
 * `/admin/audit-log` — CR-006 Phase 9 (`docs/CR-006-PHASE-9-PLAN.md`
 * §2.1). GENUINELY NEW, no Laravel equivalent — see
 * `src/lib/audit/schema.ts`'s header. Read-only: no edit/delete UI for
 * the log itself (an audit log admins can edit isn't an audit log).
 *
 * Gated by `AUDIT_LOG_VIEW` — a permission `permissions.ts` defined back
 * in Phase 2, anticipating this exact phase, unused until now.
 */
export const metadata: Metadata = {
  title: 'Admin Panel | Audit Log',
};

export default async function AdminAuditLogPage({ searchParams }: Props) {
  const session = await requireAdminSession();
  const db = await getDb();
  await requirePermissionForSession(db, session, PERMISSIONS.AUDIT_LOG_VIEW);

  const { collection, actor } = await searchParams;

  const repo = new AuditLogRepository(db);
  const entries = await repo.findRecent({
    collectionName: collection || undefined,
    actorEmail: actor || undefined,
  });

  return (
    <>
      <AdminStylesheets />

      <section className="content-header">
        <h1>Audit Log</h1>
        <ol className="breadcrumb">
          <li>
            <a href="/admin/home">
              <i className="fa fa-dashboard"></i> Dashboard
            </a>
          </li>
          <li className="active">Audit Log</li>
        </ol>
      </section>

      <section className="content">
        <div className="row">
          <div className="col-xs-12">
            <div className="box">
              <div className="box-header">
                <form method="get" className="form-inline">
                  <div className="form-group" style={{ marginRight: 10 }}>
                    <input
                      type="text"
                      name="collection"
                      className="form-control input-sm"
                      placeholder="Filter by collection"
                      defaultValue={collection ?? ''}
                    />
                  </div>
                  <div className="form-group" style={{ marginRight: 10 }}>
                    <input
                      type="text"
                      name="actor"
                      className="form-control input-sm"
                      placeholder="Filter by actor email"
                      defaultValue={actor ?? ''}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm">
                    Filter
                  </button>
                  {(collection || actor) && (
                    <a href="/admin/audit-log" className="btn btn-default btn-sm" style={{ marginLeft: 6 }}>
                      Clear
                    </a>
                  )}
                </form>
                <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#888' }}>
                  Showing the {entries.length} most recent entries (up to 200). Records actor,
                  action, collection, and target id for every admin write across this application
                  — does not record before/after field values.
                </p>
              </div>
              <div className="box-body">
                <table className="table table-bordered table-hover">
                  <thead>
                    <tr>
                      <th style={{ width: '16%' }}>Time</th>
                      <th style={{ width: '20%' }}>Actor</th>
                      <th style={{ width: '10%' }}>Action</th>
                      <th style={{ width: '18%' }}>Collection</th>
                      <th style={{ width: '14%' }}>Target Id</th>
                      <th style={{ width: '22%' }}>Changed Fields</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.timestamp).toLocaleString()}</td>
                        <td>{entry.actorEmail ?? <em className="text-muted">unknown</em>}</td>
                        <td>{entry.action}</td>
                        <td>
                          <code>{entry.collectionName}</code>
                        </td>
                        <td>{entry.targetId ?? '—'}</td>
                        <td>{entry.changedFields?.join(', ') ?? '—'}</td>
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
