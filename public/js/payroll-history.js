'use strict';

(async function () {
  const session = await mountAppShell();
  if (!session) return;

  const content = document.getElementById('page-content');
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  async function load() {
    content.innerHTML = `<div class="page-header"><h1>Payroll history</h1><p>Loading…</p></div>`;
    const data = await Api.get('/api/payroll/runs');
    renderList(data.runs);
  }

  function renderList(runs) {
    content.innerHTML = `
      <div class="page-header">
        <h1>Payroll history</h1>
        <p>Every payroll run your company has filed, with totals and exports.</p>
      </div>
      <div id="detail"></div>
      <div class="card" style="padding:0;">
        ${runs.length === 0 ? `
          <div class="empty-state">
            <h3>No payroll runs yet</h3>
            <p>Run your first payroll to see it appear here.</p>
          </div>
        ` : `
          <table class="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Employees</th>
                <th class="amount">Gross</th>
                <th class="amount">PAYE</th>
                <th class="amount">Net Pay</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${runs.map((r) => `
                <tr>
                  <td>${MONTHS[r.period_month - 1]} ${r.period_year}</td>
                  <td>${r.employee_count}</td>
                  <td class="amount">${fmtMoney(r.total_gross)}</td>
                  <td class="amount">${fmtMoney(r.total_tax)}</td>
                  <td class="amount">${fmtMoney(r.total_net)}</td>
                  <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-secondary btn-sm view-btn" data-id="${r.id}">View</button>
                    <a href="/api/payroll/runs/${r.id}/export.csv" class="btn btn-secondary btn-sm">CSV</a>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${r.id}">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;

    content.querySelectorAll('.view-btn').forEach((btn) =>
      btn.addEventListener('click', () => viewDetail(Number(btn.dataset.id)))
    );
    content.querySelectorAll('.delete-btn').forEach((btn) =>
      btn.addEventListener('click', () => onDelete(Number(btn.dataset.id)))
    );
  }

  async function viewDetail(runId) {
    const data = await Api.get(`/api/payroll/runs/${runId}`);
    const detail = document.getElementById('detail');
    const periodLabel = `${MONTHS[data.run.period_month - 1]} ${data.run.period_year}`;
    detail.innerHTML = `
      <div class="card">
        <div class="flex-between" style="margin-bottom: 12px;">
          <h2 class="mt-0">${periodLabel}</h2>
          <button class="btn btn-secondary btn-sm" id="close-detail">Close</button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>Employee</th><th class="amount">Gross</th><th class="amount">PAYE</th><th class="amount">Pension</th><th class="amount">Net</th><th></th></tr>
          </thead>
          <tbody>
            ${data.items.map((it) => `
              <tr>
                <td>${escapeHtml(it.employee_name)}</td>
                <td class="amount">${fmtMoney(it.gross_salary)}</td>
                <td class="amount">${fmtMoney(it.income_tax)}</td>
                <td class="amount">${fmtMoney(it.employee_pension)}</td>
                <td class="amount"><strong>${fmtMoney(it.net_pay)}</strong></td>
                <td style="text-align:right;"><a href="/api/payroll/runs/${runId}/payslip/${it.employee_id}" target="_blank" class="btn btn-secondary btn-sm">Payslip</a></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    document.getElementById('close-detail').addEventListener('click', () => { detail.innerHTML = ''; });
    detail.scrollIntoView({ behavior: 'smooth' });
  }

  async function onDelete(runId) {
    if (!confirm('Delete this payroll run? This cannot be undone and should only be done if it was run in error.')) return;
    try {
      await Api.del(`/api/payroll/runs/${runId}`);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  await load();
})();
