import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import type { Session } from '@/types';

type AuthTab = 'login' | 'register';

export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [tab, setTab] = useState<AuthTab>('login');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const session = await Api.post<Session>('/api/auth/login', {
        email: form.get('email'),
        password: form.get('password'),
      });
      setSession(session);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const session = await Api.post<Session>('/api/auth/register', {
        companyName: form.get('companyName'),
        fullName: form.get('fullName'),
        email: form.get('email'),
        password: form.get('password'),
      });
      setSession(session);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="seal-mark">
          <span>℞</span>
        </div>
        <h1>Habesha Payroll</h1>
        <p className="subtitle">
          PAYE &amp; pension, calculated correctly — updated the moment ERCA
          changes the rules.
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={tab === 'login' ? 'active' : undefined}
            onClick={() => {
              setTab('login');
              setError('');
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'active' : undefined}
            onClick={() => {
              setTab('register');
              setError('');
            }}
          >
            Register company
          </button>
        </div>

        {error ? <div className="alert-banner error">{error}</div> : null}

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="login-email">Work email</label>
              <input
                type="email"
                id="login-email"
                name="email"
                required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                name="password"
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn" disabled={submitting}>
              Sign in
            </button>
            <div className="help-text" style={{ marginTop: 12, textAlign: 'center' }}>
              <Link to="/forgot-password">Forgot your password?</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field">
              <label htmlFor="reg-company">Company name</label>
              <input
                type="text"
                id="reg-company"
                name="companyName"
                required
                placeholder="e.g. Adwa Trading PLC"
              />
            </div>
            <div className="field">
              <label htmlFor="reg-name">Your name</label>
              <input
                type="text"
                id="reg-name"
                name="fullName"
                placeholder="e.g. Selam Tesfaye"
              />
            </div>
            <div className="field">
              <label htmlFor="reg-email">Work email</label>
              <input
                type="email"
                id="reg-email"
                name="email"
                required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="reg-password">Password</label>
              <input
                type="password"
                id="reg-password"
                name="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <div className="help-text">At least 8 characters.</div>
            </div>
            <button type="submit" className="btn btn-accent" disabled={submitting}>
              Create account
            </button>
          </form>
        )}

        <div className="auth-footnote">RATE SCHEDULE: PROCLAMATION NO. 1395/2026</div>
      </div>
    </div>
  );
}
