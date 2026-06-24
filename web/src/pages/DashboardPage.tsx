import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Api } from '@/lib/api';
import { fmtDateTime, fmtMoney, MONTH_NAMES } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { PageHero } from '@/components/layout/PageHero';
import {
  IconCalendar,
  IconCheck,
  IconFile,
  IconTrendUp,
  IconUser,
  IconUsers,
  IconWallet,
} from '@/components/ui/Icons';
import type { ActivityEntry, Employee, PayrollRunSummary, RateSchedule } from '@/types';

const ACTION_LABELS: Record<string, string> = {
  'employee.created': 'Employee added',
  'employee.updated': 'Employee updated',
  'employee.deleted': 'Employee removed',
  'employee.imported': 'Bulk import completed',
  'payroll.run': 'Payroll run completed',
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

export function DashboardPage() {
  const { session } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [rate, setRate] = useState<RateSchedule | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      Api.get<{ employees: Employee[] }>('/api/employees'),
      Api.get<{ runs: PayrollRunSummary[] }>('/api/payroll/runs'),
      Api.get<{ entries: ActivityEntry[] }>('/api/activity'),
      Api.get<RateSchedule>('/api/rate-schedule'),
    ])
      .then(([employeesData, runsData, activityData, rateData]) => {
        setEmployees(employeesData.employees);
        setRuns(runsData.runs);
        setActivity(activityData.entries.slice(0, 6));
        setRate(rateData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageHero eyebrow="Command Center" title="Operating dashboard" description="Loading workspace data…" />
    );
  }

  if (error) {
    return <div className="alert-banner error">{error}</div>;
  }

  const activeEmployees = employees.filter((e) => e.employment_status === 'active');
  const monthlyGrossTotal = activeEmployees.reduce(
    (s, e) => s + e.basic_salary + e.transport_allowance,
    0,
  );
  const lastRun = runs[0];
  const avgSalary = activeEmployees.length
    ? monthlyGrossTotal / activeEmployees.length
    : 0;

  return (
    <>
      <PageHero
        eyebrow="Command Center"
        title="Operating dashboard"
        description={`${session?.company.name} — payroll pulse, compliance status, and quick actions.`}
        actions={
          <>
            <Link to="/payroll-history" className="btn btn-secondary">
              History
            </Link>
            {session?.user.role === 'admin' ? (
              <Link to="/payroll-run" className="btn">
                + Run Payroll
              </Link>
            ) : null}
          </>
        }
        variant="gradient"
      />

      {rate?.latest ? (
        <div className="rate-banner">
          <span className="rate-banner-dot">●</span>
          <span>
            PAYE rates verified <strong>{rate.latest.verified_date}</strong>{' '}
            (schedule <code>{rate.latest.version}</code>) — ERCA compliance active.
          </span>
        </div>
      ) : null}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon teal">
            <IconUsers width={22} height={22} />
          </div>
          <div className="stat-card-body">
            <div className="label">Active employees</div>
            <div className="value">{activeEmployees.length}</div>
            <div className="stat-card-trend up">
              <IconTrendUp width={14} height={14} />
              {employees.length} total roster
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <IconWallet width={22} height={22} />
          </div>
          <div className="stat-card-body">
            <div className="label">Monthly gross</div>
            <div className="value">ETB {fmtMoney(monthlyGrossTotal)}</div>
            <div className="stat-card-trend neutral">
              Avg ETB {fmtMoney(avgSalary)} / employee
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon amber">
            <IconFile width={22} height={22} />
          </div>
          <div className="stat-card-body">
            <div className="label">Payroll runs</div>
            <div className="value">{runs.length}</div>
            <div className="stat-card-trend up">
              <IconCheck width={14} height={14} />
              Filed &amp; archived
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <IconCalendar width={22} height={22} />
          </div>
          <div className="stat-card-body">
            <div className="label">Last run</div>
            <div className="value" style={{ fontSize: '18px' }}>
              {lastRun
                ? `${MONTH_NAMES[lastRun.period_month - 1]} ${lastRun.period_year}`
                : '—'}
            </div>
            <div className="stat-card-trend neutral">
              {lastRun ? `ETB ${fmtMoney(lastRun.total_net)} net` : 'No runs yet'}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-stack">
          <div className="briefing-card">
            <h2>Payroll briefing</h2>
            <p>
              {activeEmployees.length > 0
                ? `Your roster is ready. ${activeEmployees.length} active employee${activeEmployees.length === 1 ? '' : 's'} with a combined monthly gross of ETB ${fmtMoney(monthlyGrossTotal)}.`
                : 'Add employees to your roster to start calculating PAYE and pension correctly.'}
            </p>
            <div className="briefing-metrics">
              <div className="briefing-metric">
                <div className="label">Gross payroll</div>
                <div className="value">ETB {fmtMoney(monthlyGrossTotal)}</div>
              </div>
              <div className="briefing-metric">
                <div className="label">Active staff</div>
                <div className="value">{activeEmployees.length}</div>
              </div>
              <div className="briefing-metric">
                <div className="label">Runs filed</div>
                <div className="value">{runs.length}</div>
              </div>
              <div className="briefing-metric">
                <div className="label">Rate version</div>
                <div className="value" style={{ fontSize: '14px' }}>
                  {rate?.latest?.version ?? '—'}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="mt-0">Quick actions</h2>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {session?.user.role === 'admin' ? (
                <Link to="/payroll-run" className="btn btn-accent">
                  Run payroll for this month
                </Link>
              ) : null}
              <Link to="/employees" className="btn btn-secondary">
                Manage employees
              </Link>
              <Link to="/payroll-history" className="btn btn-secondary">
                View history
              </Link>
            </div>
          </div>

          {activeEmployees.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <h3>No employees yet</h3>
                <p>Add your first employee to start running payroll.</p>
                <br />
                <Link to="/employees" className="btn">
                  Add an employee
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <aside>
          <div className="card card-flat">
            <div className="card-header" style={{ padding: '18px 20px 0' }}>
              <h2 className="mt-0">Live queue</h2>
              <Link to="/activity" className="btn btn-sm btn-secondary">
                View all
              </Link>
            </div>
            {activity.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 20px' }}>
                <p>No recent activity</p>
              </div>
            ) : (
              <ul className="activity-feed">
                {activity.map((entry) => (
                  <li key={entry.id} className="activity-item">
                    <div className={`activity-icon ${activityIcon(entry.action)}`}>
                      {entry.action.startsWith('employee') ? (
                        <IconUser width={16} height={16} />
                      ) : entry.action.startsWith('payroll') ? (
                        <IconCheck width={16} height={16} />
                      ) : (
                        <IconFile width={16} height={16} />
                      )}
                    </div>
                    <div className="activity-body">
                      <strong>{ACTION_LABELS[entry.action] || entry.action}</strong>
                      <span>{entry.detail || entry.user_name || entry.user_email || '—'}</span>
                    </div>
                    <time className="activity-time">{fmtDateTime(entry.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
