'use strict';

(async function () {
  const session = await mountAppShell();
  if (!session) return;

  const content = document.getElementById('page-content');
  let employees = [];
  let editingId = null;

  async function load() {
    const data = await Api.get('/api/employees');
    employees = data.employees;
    render();
  }

  function render() {
    content.innerHTML = `
      <div class="page-header page-header-row">
        <div>
          <h1>Employees</h1>
          <p>Add employees once — payroll recalculates PAYE and pension automatically every run.</p>
        </div>
        <button class="btn btn-accent" id="add-btn">+ Add employee</button>
      </div>

      <div id="form-card" class="card hidden">
        <h2 id="form-title">Add employee</h2>
        <div id="form-alert" class="alert-banner error hidden"></div>
        <form id="employee-form">
          <div class="field-row">
            <div class="field">
              <label for="f-name">Full name</label>
              <input type="text" id="f-name" required />
            </div>
            <div class="field">
              <label for="f-name-am">Full name (Amharic, optional)</label>
              <input type="text" id="f-name-am" placeholder="ስም" />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-position">Position</label>
              <input type="text" id="f-position" placeholder="e.g. Accountant" />
            </div>
            <div class="field">
              <label for="f-salary">Monthly gross salary (ETB)</label>
              <input type="number" id="f-salary" min="0" step="0.01" required />
            </div>
          </div>
          <div class="field-row">
            <div class="field">
              <label for="f-start">Start date</label>
              <input type="date" id="f-start" />
            </div>
            <div class="field">
              <label for="f-status">Status</label>
              <select id="f-status">
                <option value="active">Active</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
          <div class="field checkbox-field">
            <input type="checkbox" id="f-exempt" style="width:auto;" />
            <label for="f-exempt" style="margin:0;">Foreign national — exempt from mandatory pension contribution</label>
          </div>
          <div style="display:flex; gap:10px; margin-top: 8px;">
            <button type="submit" class="btn" id="save-btn">Save employee</button>
            <button type="button" class="btn btn-secondary" id="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>

      <div class="card" style="padding: 0;">
        ${employees.length === 0 ? `
          <div class="empty-state">
            <h3>No employees yet</h3>
            <p>Add your first employee to start running payroll.</p>
          </div>
        ` : `
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th class="amount">Gross Salary</th>
                <th>Status</th>
                <th>Pension</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${employees.map((e) => `
                <tr>
                  <td>${escapeHtml(e.full_name)}${e.full_name_am ? `<div class="text-muted" style="font-size:12px;">${escapeHtml(e.full_name_am)}</div>` : ''}</td>
                  <td>${escapeHtml(e.position || '—')}</td>
                  <td class="amount">ETB ${fmtMoney(e.gross_salary)}</td>
                  <td><span class="badge ${e.employment_status === 'active' ? 'badge-success' : 'badge-muted'}">${e.employment_status}</span></td>
                  <td>${e.is_pension_exempt ? '<span class="text-muted">Exempt</span>' : '7% / 11%'}</td>
                  <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-secondary btn-sm edit-btn" data-id="${e.id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${e.id}">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;

    document.getElementById('add-btn').addEventListener('click', () => openForm(null));
    document.getElementById('cancel-btn').addEventListener('click', closeForm);
    document.getElementById('employee-form').addEventListener('submit', onSubmit);
    content.querySelectorAll('.edit-btn').forEach((btn) =>
      btn.addEventListener('click', () => openForm(Number(btn.dataset.id)))
    );
    content.querySelectorAll('.delete-btn').forEach((btn) =>
      btn.addEventListener('click', () => onDelete(Number(btn.dataset.id)))
    );
  }

  function openForm(id) {
    editingId = id;
    const formCard = document.getElementById('form-card');
    formCard.classList.remove('hidden');
    document.getElementById('form-alert').classList.add('hidden');
    document.getElementById('form-title').textContent = id ? 'Edit employee' : 'Add employee';

    if (id) {
      const emp = employees.find((e) => e.id === id);
      document.getElementById('f-name').value = emp.full_name;
      document.getElementById('f-name-am').value = emp.full_name_am || '';
      document.getElementById('f-position').value = emp.position || '';
      document.getElementById('f-salary').value = emp.gross_salary;
      document.getElementById('f-start').value = emp.start_date || '';
      document.getElementById('f-status').value = emp.employment_status;
      document.getElementById('f-exempt').checked = Boolean(emp.is_pension_exempt);
    } else {
      document.getElementById('employee-form').reset();
      document.getElementById('f-status').value = 'active';
    }
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeForm() {
    editingId = null;
    document.getElementById('form-card').classList.add('hidden');
  }

  async function onSubmit(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    const payload = {
      fullName: document.getElementById('f-name').value,
      fullNameAm: document.getElementById('f-name-am').value,
      position: document.getElementById('f-position').value,
      grossSalary: Number(document.getElementById('f-salary').value),
      startDate: document.getElementById('f-start').value,
      employmentStatus: document.getElementById('f-status').value,
      isPensionExempt: document.getElementById('f-exempt').checked,
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
      const alertBox = document.getElementById('form-alert');
      alertBox.textContent = err.message;
      alertBox.classList.remove('hidden');
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function onDelete(id) {
    const emp = employees.find((e) => e.id === id);
    if (!confirm(`Delete ${emp.full_name}? This cannot be undone.`)) return;
    try {
      await Api.del(`/api/employees/${id}`);
      await load();
    } catch (err) {
      alert(err.message);
    }
  }

  await load();
})();
