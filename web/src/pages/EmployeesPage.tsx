import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Api } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { toAmharic } from '@/lib/translit';
import { PageHero } from '@/components/layout/PageHero';
import { IconShield, IconTrendUp, IconUsers, IconWallet } from '@/components/ui/Icons';
import type { Employee, ImportPreview, ImportResult } from '@/types';

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}
const CSV_TEMPLATE =
  'full_name,full_name_am,position,basic_salary,transport_allowance,is_pension_exempt,start_date\n' +
  'Abebe Kebede,አበበ ከበደ,Accountant,12000,1500,no,2024-01-15';

interface EmployeeFormState {
  fullName: string;
  fullNameAm: string;
  position: string;
  basicSalary: string;
  transportAllowance: string;
  startDate: string;
  employmentStatus: 'active' | 'terminated';
  isPensionExempt: boolean;
}

const emptyForm: EmployeeFormState = {
  fullName: '',
  fullNameAm: '',
  position: '',
  basicSalary: '',
  transportAllowance: '',
  startDate: '',
  employmentStatus: 'active',
  isPensionExempt: false,
};

export function EmployeesPage() {
  const { session } = useAuth();
  const isAdmin = session?.user.role === 'admin';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Tracks whether the Amharic field has been set manually; once it has, we
  // stop auto-filling it from the Latin name so we never clobber an edit.
  const [amTouched, setAmTouched] = useState(false);

  // A2: CSV import
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importError, setImportError] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportResult | null>(null);

  const load = useCallback(async () => {
    const data = await Api.get<{ employees: Employee[] }>('/api/employees');
    setEmployees(data.employees);
  }, []);

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [load]);

  function openForm(id: number | null) {
    setEditingId(id);
    setShowForm(true);
    setShowImport(false);
    setError('');

    if (id) {
      const emp = employees.find((e) => e.id === id);
      if (!emp) return;
      // Treat an existing Amharic name as a manual value — don't overwrite it.
      setAmTouched(Boolean(emp.full_name_am));
      setForm({
        fullName: emp.full_name,
        fullNameAm: emp.full_name_am || '',
        position: emp.position || '',
        basicSalary: String(emp.basic_salary),
        transportAllowance: emp.transport_allowance ? String(emp.transport_allowance) : '',
        startDate: emp.start_date || '',
        employmentStatus: emp.employment_status,
        isPensionExempt: Boolean(emp.is_pension_exempt),
      });
    } else {
      setAmTouched(false);
      setForm(emptyForm);
    }
  }

  function closeForm() {
    setEditingId(null);
    setShowForm(false);
    setError('');
  }

  function openImport() {
    setShowImport(true);
    setShowForm(false);
    setImportText('');
    setPreview(null);
    setImportError('');
    setImportSummary(null);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result || ''));
      setPreview(null);
      setImportSummary(null);
    };
    reader.readAsText(file);
  }

  async function runPreview() {
    setImportError('');
    setImportBusy(true);
    setImportSummary(null);
    try {
      const res = await Api.post<ImportPreview>('/api/employees/import', {
        csv: importText,
        commit: false,
      });
      setPreview(res);
    } catch (err) {
      setPreview(null);
      setImportError(err instanceof Error ? err.message : 'Could not read CSV.');
    } finally {
      setImportBusy(false);
    }
  }

  async function commitImport() {
    setImportError('');
    setImportBusy(true);
    try {
      const res = await Api.post<ImportResult>('/api/employees/import', {
        csv: importText,
        commit: true,
      });
      setImportSummary(res);
      setPreview(null);
      setImportText('');
      await load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImportBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      fullName: form.fullName,
      fullNameAm: form.fullNameAm,
      position: form.position,
      basicSalary: Number(form.basicSalary),
      transportAllowance: form.transportAllowance ? Number(form.transportAllowance) : 0,
      startDate: form.startDate,
      employmentStatus: form.employmentStatus,
      isPensionExempt: form.isPensionExempt,
    };

    try {
      if (editingId) {
        await Api.put(`/api/employees/${editingId}`, payload);
      } else {
        await Api.post('/api/employees', payload);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: number) {
    const emp = employees.find((e) => e.id === id);
    if (!emp || !confirm(`Delete ${emp.full_name}? This cannot be undone.`)) {
      return;
    }

    try {
      await Api.del(`/api/employees/${id}`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  const activeCount = employees.filter((e) => e.employment_status === 'active').length;
  const monthlyGross = employees
    .filter((e) => e.employment_status === 'active')
    .reduce((s, e) => s + e.basic_salary + e.transport_allowance, 0);
  const exemptCount = employees.filter((e) => e.is_pension_exempt).length;

  return (
    <>
      <PageHero
        eyebrow="Identity Directory"
        title="Employees"
        description="Manage your workforce roster, salaries, and pension status."
        actions={
          isAdmin ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={openImport}>
                Import CSV
              </button>
              <button type="button" className="btn" onClick={() => openForm(null)}>
                + Add employee
              </button>
            </>
          ) : (
            <span className="badge badge-viewer">View-only access</span>
          )
        }
        variant="gradient"
      />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card-icon teal">
            <IconUsers width={22} height={22} />
          </div>
          <div className="stat-card-body">
            <div className="label">Total employees</div>
            <div className="value">{employees.length}</div>
            <div className="stat-card-trend up">
              <IconTrendUp width={14} height={14} />
              {activeCount} active
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon green">
            <IconWallet width={22} height={22} />
          </div>
          <div className="stat-card-body">
            <div className="label">Monthly gross</div>
            <div className="value">ETB {fmtMoney(monthlyGross)}</div>
            <div className="stat-card-trend neutral">Active roster total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <IconShield width={22} height={22} />
          </div>
          <div className="stat-card-body">
            <div className="label">Pension exempt</div>
            <div className="value">{exemptCount}</div>
            <div className="stat-card-trend neutral">Foreign nationals</div>
          </div>
        </div>
      </div>

      {showImport && isAdmin ? (
        <div className="card">
          <div className="page-header-row" style={{ alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Bulk import employees</h2>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowImport(false)}
            >
              Close
            </button>
          </div>
          <p className="help-text" style={{ marginTop: 4 }}>
            Required: <code>full_name</code>, <code>basic_salary</code>.
          </p>

          {importError ? <div className="alert-banner error">{importError}</div> : null}
          {importSummary ? (
            <div className="alert-banner success">
              Imported {importSummary.imported} employee(s).{' '}
              {importSummary.skipped > 0
                ? `${importSummary.skipped} row(s) were skipped due to errors.`
                : 'No rows skipped.'}
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="import-file">Upload a .csv file</label>
            <input type="file" id="import-file" accept=".csv,text/csv" onChange={onFile} />
          </div>
          <div className="field">
            <label htmlFor="import-text">…or paste CSV directly</label>
            <textarea
              id="import-text"
              rows={6}
              value={importText}
              placeholder={CSV_TEMPLATE}
              onChange={(e) => {
                setImportText(e.target.value);
                setPreview(null);
                setImportSummary(null);
              }}
              style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 13 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={runPreview}
              disabled={importBusy || !importText.trim()}
            >
              Preview
            </button>
            {preview && preview.validCount > 0 ? (
              <button
                type="button"
                className="btn"
                onClick={commitImport}
                disabled={importBusy}
              >
                Import {preview.validCount} valid row(s)
              </button>
            ) : null}
          </div>

          {preview ? (
            <div style={{ marginTop: 16 }}>
              <div className="help-text" style={{ marginBottom: 8 }}>
                {preview.validCount} valid · {preview.invalidCount} with errors ·{' '}
                {preview.total} total
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Name</th>
                    <th className="amount">Basic</th>
                    <th className="amount">Transport</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.line}>
                      <td>{r.line}</td>
                      <td>{r.data.fullName || '—'}</td>
                      <td className="amount">{fmtMoney(r.data.basicSalary)}</td>
                      <td className="amount">{fmtMoney(r.data.transportAllowance)}</td>
                      <td>
                        {r.valid ? (
                          <span className="badge badge-success">OK</span>
                        ) : (
                          <span className="text-muted" style={{ color: 'var(--color-alert)' }}>
                            {r.errors.join(' ')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {showForm ? (
        <div className="card">
          <h2>{editingId ? 'Edit employee' : 'Add employee'}</h2>
          {error ? <div className="alert-banner error">{error}</div> : null}
          <form onSubmit={onSubmit}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="f-name">Full name</label>
                <input
                  type="text"
                  id="f-name"
                  required
                  value={form.fullName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f) => ({
                      ...f,
                      fullName: value,
                      // Auto-transliterate until the user edits Amharic by hand.
                      fullNameAm: amTouched ? f.fullNameAm : toAmharic(value),
                    }));
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="f-name-am">Full name (Amharic)</label>
                <input
                  type="text"
                  id="f-name-am"
                  placeholder="ስም"
                  value={form.fullNameAm}
                  onChange={(e) => {
                    setAmTouched(true);
                    setForm((f) => ({ ...f, fullNameAm: e.target.value }));
                  }}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="f-position">Position</label>
                <input
                  type="text"
                  id="f-position"
                  placeholder="e.g. Accountant"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="f-salary">Monthly basic salary (ETB)</label>
                <input
                  type="number"
                  id="f-salary"
                  min={0}
                  step={0.01}
                  required
                  value={form.basicSalary}
                  onChange={(e) => setForm({ ...form, basicSalary: e.target.value })}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="f-transport">Transport allowance (ETB/month, optional)</label>
                <input
                  type="number"
                  id="f-transport"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  value={form.transportAllowance}
                  onChange={(e) => setForm({ ...form, transportAllowance: e.target.value })}
                />
                <small className="text-muted">
                  Non-taxable up to the lower of ETB 2,200 or 25% of basic salary; any
                  excess is taxed.
                </small>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="f-start">Start date</label>
                <input
                  type="date"
                  id="f-start"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="f-status">Status</label>
                <select
                  id="f-status"
                  value={form.employmentStatus}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      employmentStatus: e.target.value as 'active' | 'terminated',
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
            <div className="field checkbox-field">
              <input
                type="checkbox"
                id="f-exempt"
                checked={form.isPensionExempt}
                onChange={(e) => setForm({ ...form, isPensionExempt: e.target.checked })}
              />
              <label htmlFor="f-exempt">
                Foreign national — exempt from mandatory pension contribution
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="submit" className="btn" disabled={submitting}>
                Save employee
              </button>
              <button type="button" className="btn btn-secondary" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="card" style={{ padding: 0 }}>
        {employees.length === 0 ? (
          <div className="empty-state">
            <h3>No employees yet</h3>
            <p>Add your first employee to start running payroll.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th className="amount">Basic Salary</th>
                <th className="amount">Transport</th>
                <th>Status</th>
                <th>Pension</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="table-user">
                      <div className="table-avatar">{initials(e.full_name)}</div>
                      <div>
                        <div className="table-user-name">{e.full_name}</div>
                        {e.full_name_am ? (
                          <div className="table-user-meta">{e.full_name_am}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>{e.position || '—'}</td>
                  <td className="amount">ETB {fmtMoney(e.basic_salary)}</td>
                  <td className="amount">
                    {e.transport_allowance ? `ETB ${fmtMoney(e.transport_allowance)}` : '—'}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        e.employment_status === 'active' ? 'badge-success' : 'badge-muted'
                      }`}
                    >
                      {e.employment_status}
                    </span>
                  </td>
                  <td>
                    {e.is_pension_exempt ? (
                      <span className="text-muted">Exempt</span>
                    ) : (
                      '7% / 11%'
                    )}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openForm(e.id)}
                        >
                          Edit
                        </button>{' '}
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => onDelete(e.id)}
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
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
