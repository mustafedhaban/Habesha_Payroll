import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { PageHero } from '@/components/layout/PageHero';
import { Api } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import type { InviteResult, ProfileUpdateResult, RateSchedule, Role, Session, TeamData } from '@/types';

export function SettingsPage() {
  const { session, refresh } = useAuth();
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

      <div className="card" id="profile">
        <h2 className="mt-0">Your profile</h2>
        {session ? <ProfileForm session={session} onSaved={refresh} /> : <p>Loading…</p>}
      </div>

      <div className="card">
        <h2 className="mt-0">Company profile</h2>
        <CompanyProfileForm
          initialName={session?.company.name ?? ''}
          initialTin={session?.company.tin ?? ''}
          isAdmin={Boolean(isAdmin)}
          onSaved={async () => {
            await refresh();
          }}
        />
      </div>

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

function ProfileForm({
  session,
  onSaved,
}: {
  session: Session;
  onSaved: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(session.user.fullName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setFullName(session.user.fullName || '');
  }, [session.user.fullName]);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileSaved(false);
    setProfileError('');
    try {
      await Api.put<ProfileUpdateResult>('/api/user/profile', { fullName });
      await onSaved();
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setProfileBusy(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordBusy(true);
    setPasswordSaved(false);
    setPasswordError('');
    try {
      await Api.post('/api/user/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="profile-sections">
      <form onSubmit={onSaveProfile}>
        <p className="help-text" style={{ marginTop: 0 }}>
          Your display name appears in the top bar and activity log.
        </p>
        {profileError ? <div className="alert-banner error">{profileError}</div> : null}
        {profileSaved ? (
          <div className="alert-banner success" style={{ marginBottom: 16 }}>
            Profile updated.
          </div>
        ) : null}
        <div className="field-row">
          <div className="field">
            <label htmlFor="profile-name">Display name</label>
            <input
              id="profile-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input id="profile-email" value={session.user.email} disabled />
          </div>
        </div>
        <button type="submit" className="btn btn-secondary" disabled={profileBusy}>
          Save profile
        </button>
      </form>

      <form onSubmit={onChangePassword} className="profile-password-form">
        <h3>Change password</h3>
        {passwordError ? <div className="alert-banner error">{passwordError}</div> : null}
        {passwordSaved ? (
          <div className="alert-banner success" style={{ marginBottom: 16 }}>
            Password updated.
          </div>
        ) : null}
        <div className="field-row">
          <div className="field">
            <label htmlFor="current-password">Current password</label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <button type="submit" className="btn btn-secondary" disabled={passwordBusy}>
          Update password
        </button>
      </form>
    </div>
  );
}

function CompanyProfileForm({
  initialName,
  initialTin,
  isAdmin,
  onSaved,
}: {
  initialName: string;
  initialTin: string;
  isAdmin: boolean;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [tin, setTin] = useState(initialTin);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(initialName);
    setTin(initialTin);
  }, [initialName, initialTin]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setBusy(true);
    setSaved(false);
    try {
      await Api.put<{ company: { name: string; tin: string | null } }>('/api/company', {
        name,
        tin,
      });
      await onSaved();
      setSaved(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save company profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <p className="help-text" style={{ marginTop: 0 }}>
        Shown on payslips and exports. TIN helps finance teams match ERCA records.
      </p>
      {saved ? (
        <div className="alert-banner success" style={{ marginBottom: 16 }}>
          Company profile updated.
        </div>
      ) : null}
      <div className="field-row">
        <div className="field">
          <label htmlFor="co-name">Company name</label>
          <input
            id="co-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isAdmin}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="co-tin">TIN (tax ID)</label>
          <input
            id="co-tin"
            value={tin}
            onChange={(e) => setTin(e.target.value)}
            disabled={!isAdmin}
            placeholder="e.g. 0012345678"
          />
        </div>
      </div>
      {isAdmin ? (
        <button type="submit" className="btn btn-secondary" disabled={busy}>
          Save company profile
        </button>
      ) : (
        <span className="badge badge-muted">View-only</span>
      )}
    </form>
  );
}
