import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { Api } from '@/lib/api';

interface ForgotResponse {
  message: string;
  devResetLink?: string;
  devNote?: string;
}

export function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ForgotResponse | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await Api.post<ForgotResponse>('/api/auth/forgot-password', {
        email: form.get('email'),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Reset your password</h1>
        <p className="subtitle">
          Enter your work email and we'll generate a password reset link.
        </p>

        {error ? <div className="alert-banner error">{error}</div> : null}

        {result ? (
          <>
            <div className="alert-banner success">{result.message}</div>
            {result.devResetLink ? (
              <div className="card" style={{ marginTop: 12 }}>
                <div className="help-text" style={{ marginBottom: 8 }}>
                  {result.devNote}
                </div>
                <Link to={result.devResetLink} className="btn btn-accent">
                  Open reset link
                </Link>
              </div>
            ) : null}
            <div className="auth-footnote" style={{ marginTop: 16 }}>
              <Link to="/">← Back to sign in</Link>
            </div>
          </>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="fp-email">Work email</label>
              <input type="email" id="fp-email" name="email" required autoComplete="email" />
            </div>
            <button type="submit" className="btn" disabled={submitting}>
              Send reset link
            </button>
            <div className="auth-footnote" style={{ marginTop: 16 }}>
              <Link to="/">← Back to sign in</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
