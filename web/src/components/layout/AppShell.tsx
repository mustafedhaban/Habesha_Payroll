import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { TopBar } from '@/components/layout/TopBar';
import {
  IconActivity,
  IconChevronLeft,
  IconChevronRight,
  IconDashboard,
  IconHistory,
  IconLogout,
  IconPayroll,
  IconSettings,
  IconUsers,
} from '@/components/ui/Icons';
import type { ReactNode } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'habesha-sidebar-collapsed';

const NAV_ITEMS: {
  to: string;
  label: string;
  icon: ReactNode;
  section: 'main' | 'payroll';
  adminOnly?: boolean;
}[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <IconDashboard />, section: 'main' },
  { to: '/employees', label: 'Employees', icon: <IconUsers />, section: 'main' },
  { to: '/payroll-run', label: 'Run Payroll', icon: <IconPayroll />, section: 'payroll', adminOnly: true },
  { to: '/payroll-history', label: 'History', icon: <IconHistory />, section: 'payroll' },
  { to: '/activity', label: 'Activity', icon: <IconActivity />, section: 'main' },
  { to: '/settings', label: 'Settings', icon: <IconSettings />, section: 'main' },
];

function SidebarItem({
  to,
  label,
  icon,
  collapsed,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  collapsed: boolean;
}) {
  const tooltip = collapsed ? label : undefined;

  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? 'active' : undefined)}
      data-tooltip={tooltip}
      aria-label={collapsed ? label : undefined}
    >
      {icon}
      <span className="sidebar-item-label">{label}</span>
    </NavLink>
  );
}

export function AppShell() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      /* ignore storage errors */
    }
  }, [collapsed]);

  if (!session) return null;

  const isAdmin = session.user.role === 'admin';
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const mainNav = navItems.filter((item) => item.section === 'main');
  const payrollNav = navItems.filter((item) => item.section === 'payroll');

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className={`app-shell${collapsed ? ' sidebar-is-collapsed' : ''}`}>
      <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <span className="seal">ሀ</span>
            <div className="brand-text">
              Habesha Payroll
              <span className="brand-sub">Admin Suite</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            data-tooltip={collapsed ? 'Expand sidebar' : undefined}
          >
            {collapsed ? <IconChevronRight width={18} height={18} /> : <IconChevronLeft width={18} height={18} />}
          </button>
        </div>

        <div className="company-name" title={session.company.name}>
          {session.company.name}
        </div>

        <div className="sidebar-nav-label">Navigation</div>
        <nav>
          {mainNav.map((item) => (
            <SidebarItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {payrollNav.length > 0 ? (
          <>
            <div className="sidebar-nav-label">Payroll</div>
            <nav>
              {payrollNav.map((item) => (
                <SidebarItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </nav>
          </>
        ) : null}

        <div className="sidebar-footer">
          <button
            type="button"
            className="logout-btn"
            onClick={handleLogout}
            data-tooltip={collapsed ? 'Sign out' : undefined}
            aria-label={collapsed ? 'Sign out' : undefined}
          >
            <IconLogout width={18} height={18} />
            <span className="sidebar-item-label">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        <TopBar />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
