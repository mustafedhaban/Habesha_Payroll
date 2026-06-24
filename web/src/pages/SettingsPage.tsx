import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { PageHero } from '@/components/layout/PageHero';
import { Api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import type { InviteResult, RateSchedule, Role, TeamData } from '@/types';

export function SettingsPage() {
  const { session } = useAuth();
  const isAdmin = session?.user.role === 'admin';

  const [team, setTeam] = useState<TeamData | null>(null);
  const [rate, setRate] = useState<RateSchedule | null>(null);
  const [error, setError] = useState('');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('viewer');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null);

  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');

  const load = useCallback(async () => {
    const [t, r] = await Promise.all([
      Api.get<TeamData>('/api/team'),
      Api.get<RateSchedule>('/api/rate-schedule'),
    ]);
    setTeam(t);
    setRate(r);
  }, []);

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [load]);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInviteBusy(true);
    setInviteResult(null);
    try {
      const res = await Api.post<InviteResult>('/api/team/invite', {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteResult(res);
      setInviteEmail('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed.');
    } finally {
      setInviteBusy(false);
    }
  }

  async function onVerify() {
    setVerifyBusy(true);
    setError('');
    try {
      const res = await Api.post<RateSchedule>('/api/rate-schedule/verify', {
        notes: verifyNotes,
      });
      setRate(res);
      setVerifyNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record verification.');
    } finally {
      setVerifyBusy(false);
    }
  }

  return (
    <>
      <PageHero
        eyebrow="Workspace Admin"
        title="Settings"
        description="Manage your team and confirm the tax rate schedule is current."
        variant="gradient"
      />

      {error ? <div className="alert-banner error">{error}</div> : null}

      <div className="card">
        <h2 className="mt-0">Team members</h2>
        {team ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.full_name || '—'}
                    {m.id === team.currentUserId ? (
                      <span className="text-muted"> (you)</span>
                    ) : null}
                  </td>
                  <td>{m.email}</td>
                  <td>
                    <span className={`badge ${m.role === 'admin' ? 'badge-success' : 'badge-muted'}`}>
                      {m.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Loading…</p>
        )}
      </div>

      {isAdmin ? (
        <div className="card">
          <h2 className="mt-0">Invite a teammate</h2>
          <p className="help-text">
            Admins can run payroll and edit employees. Viewers have read-only access.
          </p>
          {inviteResult ? (
            <div className="alert-banner success">
              Invite created for <strong>{inviteResult.email}</strong> ({inviteResult.role}).
              <div className="help-text" style={{ marginTop: 8 }}>
                {inviteResult.devNote}
              </div>
              <code style={{ wordBreak: 'break-all' }}>{inviteResult.devInviteLink}</code>
            </div>
          ) : null}
          <form onSubmit={onInvite}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="inv-email">Email</label>
                <input
                  type="email"
                  id="inv-email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="inv-role">Role</label>
                <select
                  id="inv-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn" disabled={inviteBusy}>
              Create invite
            </button>
          </form>

          {team && team.pending.length > 0 ? (
            <>
              <h3>Pending invites</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Invited</th>
                  </tr>
                </thead>
                <tbody>
                  {team.pending.map((p) => (
                    <tr key={p.id}>
                      <td>{p.email}</td>
                      <td>{p.role}</td>
                      <td>{fmtDateTime(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="card">
        <h2 className="mt-0">Tax rate schedule</h2>
        {rate ? (
          <p>
            Active schedule: <code>{rate.activeVersion}</code>
            <br />
            {rate.latest
              ? `Last verified ${rate.latest.verified_date}${rate.latest.notes ? ` — ${rate.latest.notes}` : ''}`
              : 'Not yet verified.'}
          </p>
        ) : (
          <p>Loading…</p>
        )}
        {isAdmin ? (
          <>
            <div className="field">
              <label htmlFor="verify-notes">Verification note (optional)</label>
              <input
                type="text"
                id="verify-notes"
                placeholder="e.g. Checked ERCA bulletin — no change"
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-secondary" onClick={onVerify} disabled={verifyBusy}>
              Record a verification for today
            </button>
          </>
        ) : null}
      </div>
    </>
  );
}
