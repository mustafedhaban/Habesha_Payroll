'use strict';

(async function () {
  const session = await mountAppShell();
  if (!session) return;

  const content = document.getElementById('page-content');

  const now = new Date();
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function renderForm() {
    const monthOptions = MONTHS.map((m, i) =>
      `<option value="${i + 1}" ${i + 1 === now.getMonth() + 1 ? 'selected' : ''}>${m}</option>`
    ).join('');
    const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]
      .map((y) => `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`)
      .join('');

    content.innerHTML = `
      <div class="page-header">
        <h1>Run payroll</h1>
        <p>Computes PAYE income tax and pension for every active employee using rate schedule ${escapeHtml('2026-Proclamation-1395')}.</p>
      </div>

      <div class="card" style="max-width: 480px;">
        <h2>Select pay period</h2>
        <div id="run-alert" class="alert-banner error hidden"></div>
        <div class="field-row">
          <div class="field">
            <label for="run-month">Month</label>
            <select id="run-month">${monthOptions}</select>
          </div>
          <div class="field">
            <label for="run-year">Year</label>
            <select id="run-year">${yearOptions}</select>
          </div>
        </div>
        <button class="btn btn-accent" id="run-btn">Run payroll for this period</button>
      </div>

      <div id="results"></div>
    `;

    document.getElementById('run-btn').addEventListener('click', onRun);
  }

  async function onRun() {
    const month = Number(document.getElementById('run-month').value);
    const year = Number(document.getElementById('run-year').value);
    const btn = document.getElementById('run-btn');
    const alertBox = document.getElementById('run-alert');
    alertBox.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> Calculating…`;

    try {
      const data = await Api.post('/api/payroll/runs', { month, year });
      renderResults(data);
    } catch (err) {
      alertBox.textContent = err.message;
      alertBox.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Run payroll for this period';
    }
  }

  function renderResults(data) {
    const results = document.getElementById('results');
    const periodLabel = `${MONTHS[data.month - 1]} ${data.year}`;
    results.innerHTML = `
      <div class="alert-banner success">Payroll run completed for ${periodLabel} — ${data.items.length} employee(s) processed.</div>

      <div class="stat-grid">
        <div class="stat-card"><div class="label">Total gross</div><div class="value">ETB ${fmtMoney(data.totals.grossSalary)}</div></div>
        <div class="stat-card"><div class="label">Total PAYE</div><div class="value">ETB ${fmtMoney(data.totals.incomeTax)}</div></div>
        <div class="stat-card"><div class="label">Employee pension</div><div class="value">ETB ${fmtMoney(data.totals.employeePension)}</div></div>
        <div class="stat-card"><div class="label">Total net pay</div><div class="value">ETB ${fmtMoney(data.totals.netPay)}</div></div>
      </div>

      <div class="card" style="padding:0;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th class="amount">Gross</th>
              <th class="amount">PAYE</th>
              <th class="amount">Pension (7%)</th>
              <th class="amount">Net Pay</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((it) => `
              <tr>
                <td>${escapeHtml(it.employeeName)}</td>
                <td class="amount">${fmtMoney(it.grossSalary)}</td>
                <td class="amount">${fmtMoney(it.incomeTax)}</td>
                <td class="amount">${fmtMoney(it.employeePension)}</td>
                <td class="amount"><strong>${fmtMoney(it.netPay)}</strong></td>
                <td style="text-align:right;"><a href="/api/payroll/runs/${data.runId}/payslip/${it.employeeId}" target="_blank" class="btn btn-secondary btn-sm">Payslip</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="display:flex; gap:12px; margin-top: 8px;">
        <a href="/api/payroll/runs/${data.runId}/export.csv" class="btn">Export CSV for ERCA / pension filing</a>
        <a href="/payroll-history.html" class="btn btn-secondary">View all payroll history</a>
      </div>
    `;
  }

  renderForm();
})();
