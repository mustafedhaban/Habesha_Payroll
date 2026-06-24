import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { IconBell, IconMoon, IconSearch, IconSun } from '@/components/ui/Icons';

const ROUTE_META: Record<string, { workspace: string; page: string }> = {
  '/dashboard': { workspace: 'Command Center', page: 'Operating Dashboard' },
  '/employees': { workspace: 'Workforce', page: 'Employees' },
  '/payroll-run': { workspace: 'Payroll', page: 'Run Payroll' },
  '/payroll-history': { workspace: 'Payroll', page: 'History' },
  '/activity': { workspace: 'Audit', page: 'Activity Log' },
  '/settings': { workspace: 'Admin', page: 'Settings' },
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function TopBar() {
  const { session } = useAuth();
  const location = useLocation();
  const meta = ROUTE_META[location.pathname] ?? { workspace: 'Workspace', page: 'Dashboard' };
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  }, [dark]);

  if (!session) return null;

  const displayName = session.user.fullName || session.user.email;
  const roleLabel = session.user.role === 'admin' ? 'Administrator' : 'Viewer';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-crumb-label">Workspace</span>
        <span className="topbar-crumb-sep">/</span>
        <span className="topbar-crumb-current">{meta.workspace}</span>
      </div>

      <div className="topbar-search">
        <IconSearch width={18} height={18} />
        <input type="search" placeholder="Search workspace…" aria-label="Search workspace" />
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-icon-btn"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setDark((d) => !d)}
        >
          {dark ? <IconSun width={18} height={18} /> : <IconMoon width={18} height={18} />}
        </button>
        <button type="button" className="topbar-icon-btn topbar-icon-btn-badge" aria-label="Notifications">
          <IconBell width={18} height={18} />
          <span className="topbar-badge">3</span>
        </button>
        <div className="topbar-user">
          <div className="topbar-avatar" aria-hidden>{initials(displayName)}</div>
          <div className="topbar-user-text">
            <strong>{displayName}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
