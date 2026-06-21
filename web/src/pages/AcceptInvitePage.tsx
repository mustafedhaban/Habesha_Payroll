import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import type { Session } from '@/types';

interface InviteInfo {
  email: string;
  role: string;
  companyName: string;
}

export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError('Missing invite token.');
      return;
    }
    Api.get<InviteInfo>(`/api/auth/invite?token=${encodeURIComponent(token)}`)
      .then(setInfo)
      .catch((err: Error) => setLoadError(err.message));
  }, [token]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    try {
      const session = await Api.post<Session>('/api/auth/accept-invite', {
        token,
        fullName: form.get('fullName'),
        password: form.get('password'),
      });
      setSession(session);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invite.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Join your team</h1>

        {loadError ? (
          <>
            <div className="alert-banner error">{loadError}</div>
            <div className="auth-footnote" style={{ marginTop: 16 }}>
              <Link to="/">← Back to sign in</Link>
            </div>
          </>
        ) : !info ? (
          <p>Loading invite…</p>
        ) : (
          <>
            <p className="subtitle">
              You've been invited to <strong>{info.companyName}</strong> as a{' '}
              <strong>{info.role}</strong>. Set a password to finish.
            </p>
            {error ? <div className="alert-banner error">{error}</div> : null}
            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="ai-email">Email</label>
                <input type="email" id="ai-email" value={info.email} disabled readOnly />
              </div>
              <div className="field">
                <label htmlFor="ai-name">Your name</label>
                <input type="text" id="ai-name" name="fullName" placeholder="e.g. Selam Tesfaye" />
              </div>
              <div className="field">
                <label htmlFor="ai-password">Password</label>
                <input
                  type="password"
                  id="ai-password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <div className="help-text">At least 8 characters.</div>
              </div>
              <button type="submit" className="btn btn-accent" disabled={submitting}>
                Create account &amp; sign in
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
