import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import type { ActivityEntry } from '@/types';

const ACTION_LABELS: Record<string, string> = {
  'employee.created': 'Employee added',
  'employee.updated': 'Employee edited',
  'employee.deleted': 'Employee removed',
  'employee.imported': 'Employees imported',
  'payroll.run': 'Payroll run',
  'payroll.deleted': 'Payroll run deleted',
  'team.invited': 'Teammate invited',
  'rate_schedule.verified': 'Rate schedule verified',
};

export function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Api.get<{ entries: ActivityEntry[] }>('/api/activity')
      .then((d) => setEntries(d.entries))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Activity</h1>
        <p>Who did what, and when — a record for compliance and peace of mind.</p>
      </div>

      {error ? <div className="alert-banner error">{error}</div> : null}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state"><p>Loading…</p></div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <h3>No activity yet</h3>
            <p>Actions like running payroll or editing employees will appear here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.created_at)}</td>
                  <td>{e.user_name || e.user_email || '—'}</td>
                  <td>
                    <span className="badge badge-muted">
                      {ACTION_LABELS[e.action] || e.action}
                    </span>
                  </td>
                  <td>{e.detail || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
