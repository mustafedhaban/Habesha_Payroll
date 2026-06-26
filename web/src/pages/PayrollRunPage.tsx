import { useState } from 'react';
import { PageHero } from '@/components/layout/PageHero';
import { Link } from 'react-router-dom';
import { Api } from '@/lib/api';
import { fmtMoney, MONTH_NAMES } from '@/lib/format';
import type { PayrollPreviewResult, PayrollRunResult } from '@/types';

type PayrollView = PayrollRunResult | PayrollPreviewResult;

function isPreview(view: PayrollView): view is PayrollPreviewResult {
  return 'preview' in view && view.preview === true;
}

export function PayrollRunPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [view, setView] = useState<PayrollView | null>(null);

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  async function onPreview() {
    setError('');
    setPreviewing(true);
    setView(null);

    try {
      const data = await Api.post<PayrollPreviewResult>('/api/payroll/preview', { month, year });
      setView(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed.');
    } finally {
      setPreviewing(false);
    }
  }

  async function onRun() {
    setError('');
    setRunning(true);

    try {
      const data = await Api.post<PayrollRunResult>('/api/payroll/runs', { month, year });
      setView(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payroll run failed.');
    } finally {
      setRunning(false);
    }
  }

  const preview = view && isPreview(view) ? view : null;
  const result = view && !isPreview(view) ? view : null;

  return (
    <>
      <PageHero
        eyebrow="Payroll Engine"
        title="Run payroll"
        description="Preview calculations first, then commit when the numbers look right."
        variant="gradient"
      />

      <div className="card" style={{ maxWidth: 520 }}>
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
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onPreview}
            disabled={previewing || running}
          >
            {previewing ? (
              <>
                <span className="spinner"></span> Previewing…
              </>
            ) : (
              'Preview payroll'
            )}
          </button>
          <button type="button" className="btn btn-accent" onClick={onRun} disabled={running || previewing}>
            {running ? (
              <>
                <span className="spinner"></span> Saving…
              </>
            ) : (
              'Run payroll'
            )}
          </button>
        </div>
      </div>

      {preview ? (
        <>
          <div className="alert-banner success">
            Preview for {MONTH_NAMES[preview.month - 1]} {preview.year} — not saved yet.
            {preview.alreadyRun ? (
              <span> A payroll run already exists for this period; running again will fail until you delete it.</span>
            ) : null}
          </div>
          <PayrollTotals totals={preview.totals} />
          <PayrollItemsTable items={preview.items} mode="preview" />
        </>
      ) : null}

      {result ? (
        <>
          <div className="alert-banner success">
            {MONTH_NAMES[result.month - 1]} {result.year} payroll saved.
          </div>
          <PayrollTotals totals={result.totals} />
          <PayrollItemsTable items={result.items} mode="saved" runId={result.runId} />
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <a href={`/api/payroll/runs/${result.runId}/payslips.zip`} className="btn">
              Download all payslips (ZIP)
            </a>
            <a href={`/api/payroll/runs/${result.runId}/export.csv`} className="btn btn-secondary">
              Export for ERCA filing
            </a>
            <Link to="/payroll-history" className="btn btn-secondary">
              Payroll history
            </Link>
          </div>
        </>
      ) : null}
    </>
  );
}

function PayrollTotals({ totals }: { totals: PayrollRunResult['totals'] }) {
  return (
    <div className="stat-grid">
      <div className="stat-card">
        <div className="label">Total gross</div>
        <div className="value">ETB {fmtMoney(totals.grossPay)}</div>
      </div>
      <div className="stat-card">
        <div className="label">Total PAYE</div>
        <div className="value">ETB {fmtMoney(totals.incomeTax)}</div>
      </div>
      <div className="stat-card">
        <div className="label">Employee pension</div>
        <div className="value">ETB {fmtMoney(totals.employeePension)}</div>
      </div>
      <div className="stat-card">
        <div className="label">Total net pay</div>
        <div className="value">ETB {fmtMoney(totals.netPay)}</div>
      </div>
    </div>
  );
}

function PayrollItemsTable({
  items,
  mode,
  runId,
}: {
  items: PayrollRunResult['items'];
  mode: 'preview' | 'saved';
  runId?: number;
}) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th className="amount">Gross</th>
            <th className="amount">PAYE</th>
            <th className="amount">Pension (7%)</th>
            <th className="amount">Net Pay</th>
            {mode === 'saved' ? <th></th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.employeeId}>
              <td>
                {it.employeeName}
                {it.employeeNameAm ? (
                  <div className="table-user-meta">{it.employeeNameAm}</div>
                ) : null}
              </td>
              <td className="amount">{fmtMoney(it.grossPay)}</td>
              <td className="amount">{fmtMoney(it.incomeTax)}</td>
              <td className="amount">{fmtMoney(it.employeePension)}</td>
              <td className="amount">
                <strong>{fmtMoney(it.netPay)}</strong>
              </td>
              {mode === 'saved' && runId ? (
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <a
                    href={`/api/payroll/runs/${runId}/payslip/${it.employeeId}.pdf`}
                    className="btn btn-sm"
                  >
                    PDF
                  </a>{' '}
                  <a
                    href={`/api/payroll/runs/${runId}/payslip/${it.employeeId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    Preview
                  </a>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
