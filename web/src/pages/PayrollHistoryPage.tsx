import { useCallback, useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import { fmtMoney, MONTH_NAMES } from '@/lib/format';
import type { PayrollRunDetail, PayrollRunSummary } from '@/types';

export function PayrollHistoryPage() {
  const [runs, setRuns] = useState<PayrollRunSummary[]>([]);
  const [detail, setDetail] = useState<PayrollRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await Api.get<{ runs: PayrollRunSummary[] }>('/api/payroll/runs');
      setRuns(data.runs);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function viewDetail(runId: number) {
    const data = await Api.get<PayrollRunDetail>(`/api/payroll/runs/${runId}`);
    setDetail(data);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onDelete(runId: number) {
    if (
      !confirm(
        'Delete this payroll run? This cannot be undone and should only be done if it was run in error.',
      )
    ) {
      return;
    }

    try {
      await Api.del(`/api/payroll/runs/${runId}`);
      if (detail?.run.id === runId) {
        setDetail(null);
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  if (loading) {
    return (
      <div className="page-header">
        <h1>Payroll history</h1>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1>Payroll history</h1>
        <p>Every payroll run your company has filed, with totals and exports.</p>
      </div>

      {error ? <div className="alert-banner error">{error}</div> : null}

      {detail ? (
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <h2 className="mt-0">
              {MONTH_NAMES[detail.run.period_month - 1]} {detail.run.period_year}
            </h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDetail(null)}
            >
              Close
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th className="amount">Gross</th>
                <th className="amount">PAYE</th>
                <th className="amount">Pension</th>
                <th className="amount">Net</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((it) => (
                <tr key={it.employee_id}>
                  <td>{it.employee_name}</td>
                  <td className="amount">{fmtMoney(it.gross_salary)}</td>
                  <td className="amount">{fmtMoney(it.income_tax)}</td>
                  <td className="amount">{fmtMoney(it.employee_pension)}</td>
                  <td className="amount">
                    <strong>{fmtMoney(it.net_pay)}</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <a
                      href={`/api/payroll/runs/${detail.run.id}/payslip/${it.employee_id}`}
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
      ) : null}

      <div className="card" style={{ padding: 0 }}>
        {runs.length === 0 ? (
          <div className="empty-state">
            <h3>No payroll runs yet</h3>
            <p>Run your first payroll to see it appear here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Employees</th>
                <th className="amount">Gross</th>
                <th className="amount">PAYE</th>
                <th className="amount">Net Pay</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>
                    {MONTH_NAMES[r.period_month - 1]} {r.period_year}
                  </td>
                  <td>{r.employee_count}</td>
                  <td className="amount">{fmtMoney(r.total_gross)}</td>
                  <td className="amount">{fmtMoney(r.total_tax)}</td>
                  <td className="amount">{fmtMoney(r.total_net)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => viewDetail(r.id)}
                    >
                      View
                    </button>{' '}
                    <a
                      href={`/api/payroll/runs/${r.id}/export.csv`}
                      className="btn btn-secondary btn-sm"
                    >
                      CSV
                    </a>{' '}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(r.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
