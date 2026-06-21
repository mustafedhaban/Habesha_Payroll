'use strict';

const Api = {
  async request(method, path, body) {
    const opts = { method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(path, opts);
    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch (_) { data = null; }
    }
    if (!res.ok) {
      const message = (data && data.error) || `Request failed (${res.status})`;
      throw new Error(message);
    }
    return data;
  },
  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body || {}); },
  put(path, body) { return this.request('PUT', path, body || {}); },
  del(path) { return this.request('DELETE', path); },
};

function fmtMoney(n) {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const NAV_ITEMS = [
  { href: '/dashboard.html', label: 'Dashboard' },
  { href: '/employees.html', label: 'Employees' },
  { href: '/payroll-run.html', label: 'Run Payroll' },
  { href: '/payroll-history.html', label: 'History' },
];

/**
 * Renders the sidebar shell and injects the page's own content into
 * #page-content. Redirects to login if the session is invalid.
 * Returns the {user, company} session info on success.
 */
async function mountAppShell() {
  let session;
  try {
    session = await Api.get('/api/auth/me');
  } catch (err) {
    window.location.href = '/index.html';
    return null;
  }

  const currentPath = window.location.pathname;
  const navHtml = NAV_ITEMS.map(
    (item) =>
      `<a href="${item.href}" class="${currentPath === item.href ? 'active' : ''}">${item.label}</a>`
  ).join('');

  const shell = document.createElement('div');
  shell.className = 'app-shell';
  shell.innerHTML = `
    <aside class="sidebar">
      <div class="brand"><span class="seal">●</span> Habesha Payroll</div>
      <div class="company-name">${escapeHtml(session.company.name)}</div>
      <nav>${navHtml}</nav>
      <button class="logout-btn" id="logout-btn">Sign out</button>
    </aside>
    <main class="main" id="page-content"></main>
  `;
  document.body.innerHTML = '';
  document.body.appendChild(shell);

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await Api.post('/api/auth/logout');
    window.location.href = '/index.html';
  });

  return session;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
