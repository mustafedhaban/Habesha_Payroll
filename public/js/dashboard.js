'use strict';

(async function () {
  const session = await mountAppShell();
  if (!session) return;

  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="page-header"><h1>Dashboard</h1><p>Loading…</p></div>`;

  let employees = [];
  let runs = [];
  try {
    [employees, runs] = await Promise.all([
      Api.get('/api/employees').then((d) => d.employees),
      Api.get('/api/payroll/runs').then((d) => d.runs),
    ]);
  } catch (err) {
    content.innerHTML = `<div class="alert-banner error">${escapeHtml(err.message)}</div>`;
    return;
  }

  const activeEmployees = employees.filter((e) => e.employment_status === 'active');
  const monthlyGrossTotal = activeEmployees.reduce((s, e) => s + e.gross_salary, 0);
  const lastRun = runs[0];

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  content.innerHTML = `
    <div class="page-header">
      <h1>Welcome back</h1>
      <p>${escapeHtml(session.company.name)} — here's where payroll stands.</p>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="label">Active employees</div>
        <div class="value">${activeEmployees.length}</div>
      </div>
      <div class="stat-card">
        <div class="label">Current monthly gross</div>
        <div class="value">ETB ${fmtMoney(monthlyGrossTotal)}</div>
      </div>
      <div class="stat-card">
        <div class="label">Payroll runs filed</div>
        <div class="value">${runs.length}</div>
      </div>
      <div class="stat-card">
        <div class="label">Last run</div>
        <div class="value" style="font-size:15px;">${lastRun ? `${monthNames[lastRun.period_month - 1]} ${lastRun.period_year}` : '—'}</div>
      </div>
    </div>

    <div class="card">
      <div class="flex-between" style="margin-bottom: 16px;">
        <h2 class="mt-0">Quick actions</h2>
      </div>
      <div style="display:flex; gap:12px; flex-wrap:wrap;">
        <a href="/payroll-run.html" class="btn btn-accent">Run payroll for this month</a>
        <a href="/employees.html" class="btn btn-secondary">Manage employees</a>
        <a href="/payroll-history.html" class="btn btn-secondary">View payroll history</a>
      </div>
    </div>

    ${activeEmployees.length === 0 ? `
    <div class="card">
      <div class="empty-state">
        <h3>No employees yet</h3>
        <p>Add your first employee to start running payroll.</p>
        <br/>
        <a href="/employees.html" class="btn">Add an employee</a>
      </div>
    </div>` : ''}
  `;
})();
