import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Api } from '@/lib/api';
import type { Session } from '@/types';

interface AuthContextValue {
  session: Session | null;
  checking: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: Session | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await Api.get<Session>('/api/auth/me');
      setSession(data);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setChecking(false));
  }, [refresh]);

  const logout = useCallback(async () => {
    await Api.post('/api/auth/logout');
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, checking, refresh, logout, setSession }),
    [session, checking, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
