import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Api } from '@/lib/api';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') || '');
    const confirm = String(form.get('confirm') || '');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await Api.post('/api/auth/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Choose a new password</h1>

        {!token ? (
          <div className="alert-banner error">
            Missing reset token. Use the link from your reset request.
          </div>
        ) : done ? (
          <>
            <div className="alert-banner success">
              Password updated. You can now sign in with your new password.
            </div>
            <Link to="/" className="btn">Go to sign in</Link>
          </>
        ) : (
          <>
            {error ? <div className="alert-banner error">{error}</div> : null}
            <form onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="rp-password">New password</label>
                <input
                  type="password"
                  id="rp-password"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <div className="help-text">At least 8 characters.</div>
              </div>
              <div className="field">
                <label htmlFor="rp-confirm">Confirm new password</label>
                <input
                  type="password"
                  id="rp-confirm"
                  name="confirm"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="btn" disabled={submitting}>
                Update password
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
