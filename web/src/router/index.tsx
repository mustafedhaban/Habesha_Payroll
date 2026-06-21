import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { AcceptInvitePage } from '@/pages/AcceptInvitePage';
import { ActivityPage } from '@/pages/ActivityPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EmployeesPage } from '@/pages/EmployeesPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { PayrollHistoryPage } from '@/pages/PayrollHistoryPage';
import { PayrollRunPage } from '@/pages/PayrollRunPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProtectedRoute } from '@/router/ProtectedRoute';
import { PublicRoute } from '@/router/PublicRoute';

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [{ path: '/', element: <LoginPage /> }],
  },
  // Token-based flows render regardless of session state.
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/employees', element: <EmployeesPage /> },
          { path: '/payroll-run', element: <PayrollRunPage /> },
          { path: '/payroll-history', element: <PayrollHistoryPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/activity', element: <ActivityPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
