import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/employees', label: 'Employees' },
  { to: '/payroll-run', label: 'Run Payroll', adminOnly: true },
  { to: '/payroll-history', label: 'History' },
  { to: '/activity', label: 'Activity' },
  { to: '/settings', label: 'Settings' },
] as const;

export function AppShell() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  if (!session) return null;

  const isAdmin = session.user.role === 'admin';
  const navItems = NAV_ITEMS.filter((item) => !('adminOnly' in item && item.adminOnly) || isAdmin);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="seal">●</span> Habesha Payroll
        </div>
        <div className="company-name">{session.company.name}</div>
        <nav>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="logout-btn" onClick={handleLogout}>
          Sign out
        </button>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
