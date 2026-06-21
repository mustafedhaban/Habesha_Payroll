import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Api } from '@/lib/api';
import { fmtMoney, MONTH_NAMES } from '@/lib/format';
import type { PayrollRunResult } from '@/types';

export function PayrollRunPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PayrollRunResult | null>(null);

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  async function onRun() {
    setError('');
    setRunning(true);
    setResult(null);

    try {
      const data = await Api.post<PayrollRunResult>('/api/payroll/runs', { month, year });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payroll run failed.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Run payroll</h1>
        <p>
          Computes PAYE income tax and pension for every active employee using rate
          schedule 2026-Proclamation-1395.
        </p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h2>Select pay period</h2>
        {error ? <div className="alert-banner error">{error}</div> : null}
        <div className="field-row">
          <div className="field">
            <label htmlFor="run-month">Month</label>
            <select
              id="run-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="run-year">Year</label>
            <select
              id="run-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-accent"
          onClick={onRun}
          disabled={running}
        >
          {running ? (
            <>
              <span className="spinner"></span> Calculating…
            </>
          ) : (
            'Run payroll for this period'
          )}
        </button>
      </div>

      {result ? (
        <>
          <div className="alert-banner success">
            Payroll run completed for {MONTH_NAMES[result.month - 1]} {result.year} —{' '}
            {result.items.length} employee(s) processed.
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Total gross</div>
              <div className="value">ETB {fmtMoney(result.totals.grossPay)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total PAYE</div>
              <div className="value">ETB {fmtMoney(result.totals.incomeTax)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Employee pension</div>
              <div className="value">ETB {fmtMoney(result.totals.employeePension)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total net pay</div>
              <div className="value">ETB {fmtMoney(result.totals.netPay)}</div>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th className="amount">Gross</th>
                  <th className="amount">PAYE</th>
                  <th className="amount">Pension (7%)</th>
                  <th className="amount">Net Pay</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((it) => (
                  <tr key={it.employeeId}>
                    <td>{it.employeeName}</td>
                    <td className="amount">{fmtMoney(it.grossPay)}</td>
                    <td className="amount">{fmtMoney(it.incomeTax)}</td>
                    <td className="amount">{fmtMoney(it.employeePension)}</td>
                    <td className="amount">
                      <strong>{fmtMoney(it.netPay)}</strong>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <a
                        href={`/api/payroll/runs/${result.runId}/payslip/${it.employeeId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        Payslip
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <a href={`/api/payroll/runs/${result.runId}/export.csv`} className="btn">
              Export CSV for ERCA / pension filing
            </a>
            <Link to="/payroll-history" className="btn btn-secondary">
              View all payroll history
            </Link>
          </div>
        </>
      ) : null}
    </>
  );
}
