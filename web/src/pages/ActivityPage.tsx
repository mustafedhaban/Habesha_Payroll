import { useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { PageHero } from '@/components/layout/PageHero';
import { IconCheck, IconFile, IconUser } from '@/components/ui/Icons';
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

function activityIcon(action: string) {
  if (action.startsWith('payroll')) return 'success';
  if (action.startsWith('employee')) return 'info';
  if (action.includes('verified')) return 'warning';
  return 'muted';
}

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
      <PageHero
        eyebrow="Audit Trail"
        title="Activity log"
        description="Who did what, and when — a record for compliance and peace of mind."
        variant="gradient"
      />

      {error ? <div className="alert-banner error">{error}</div> : null}

      <div className="card card-flat">
        {loading ? (
          <div className="empty-state"><p>Loading…</p></div>
        ) : entries.length === 0 ? (
          <div className="empty-state">
            <h3>No activity yet</h3>
            <p>Actions like running payroll or editing employees will appear here.</p>
          </div>
        ) : (
          <ul className="activity-feed">
            {entries.map((e) => (
              <li key={e.id} className="activity-item">
                <div className={`activity-icon ${activityIcon(e.action)}`}>
                  {e.action.startsWith('employee') ? (
                    <IconUser width={16} height={16} />
                  ) : e.action.startsWith('payroll') ? (
                    <IconCheck width={16} height={16} />
                  ) : (
                    <IconFile width={16} height={16} />
                  )}
                </div>
                <div className="activity-body">
                  <strong>{ACTION_LABELS[e.action] || e.action}</strong>
                  <span>
                    {e.user_name || e.user_email || 'System'}
                    {e.detail ? ` — ${e.detail}` : ''}
                  </span>
                </div>
                <time className="activity-time">{fmtDateTime(e.created_at)}</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
