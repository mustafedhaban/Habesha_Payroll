import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Api } from '@/lib/api';
import { fmtMoney, MONTH_NAMES } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import type { Employee, PayrollRunSummary, RateSchedule } from '@/types';

export function DashboardPage() {
  const { session } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
  const [rate, setRate] = useState<RateSchedule | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      Api.get<{ employees: Employee[] }>('/api/employees'),
      Api.get<{ runs: PayrollRunSummary[] }>('/api/payroll/runs'),
      Api.get<RateSchedule>('/api/rate-schedule'),
    ])
      .then(([employeesData, runsData, rateData]) => {
        setEmployees(employeesData.employees);
        setRuns(runsData.runs);
        setRate(rateData);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Loading…</p>
      </div>
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

  return (
    <>
      <div className="page-header">
        <h1>Welcome back</h1>
        <p>{session?.company.name} — here&apos;s where payroll stands.</p>
      </div>

      {rate?.latest ? (
        <div className="rate-banner">
          <span className="rate-banner-dot">●</span>
          <span>
            PAYE rates last verified <strong>{rate.latest.verified_date}</strong>{' '}
            (schedule <code>{rate.latest.version}</code>). We watch ERCA so you don&apos;t
            have to.
          </span>
        </div>
      ) : null}

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Active employees</div>
          <div className="value">{activeEmployees.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Current monthly gross</div>
          <div className="value">ETB {fmtMoney(monthlyGrossTotal)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Payroll runs filed</div>
          <div className="value">{runs.length}</div>
        </div>
        <div className="stat-card">
          <div className="label">Last run</div>
          <div className="value" style={{ fontSize: '15px' }}>
            {lastRun
              ? `${MONTH_NAMES[lastRun.period_month - 1]} ${lastRun.period_year}`
              : '—'}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <h2 className="mt-0">Quick actions</h2>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/payroll-run" className="btn btn-accent">
            Run payroll for this month
          </Link>
          <Link to="/employees" className="btn btn-secondary">
            Manage employees
          </Link>
          <Link to="/payroll-history" className="btn btn-secondary">
            View payroll history
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
    </>
  );
}
