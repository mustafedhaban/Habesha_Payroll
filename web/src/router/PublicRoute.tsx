import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

export function PublicRoute() {
  const { session, checking } = useAuth();

  if (checking) {
    return (
      <div className="auth-page">
        <p>Loading…</p>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
