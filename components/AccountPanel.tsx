'use client';

import { useState } from 'react';

export type AccountUser = { id: string; username: string };
export type WorkbookItem = { id: string; title: string; revision: number; status: string; updatedAt: string };

const ACTION_LABELS: Record<string, string> = {
  workbook_created: 'Created', workbook_saved: 'Saved', local_import: 'Moved from this device',
};
const IMPACT_LABELS: Record<string, string> = {
  claims_verified: 'totals verified', claims_recalculated: 'totals re-checked', claims_withheld: 'totals on hold',
};

export default function AccountPanel({ user, workbooks, selectedId, busy, error, audit,
  onAuth, onLogout, onOpen, onMigrate, onAudit }: {
  user: AccountUser | null;
  workbooks: WorkbookItem[];
  selectedId: string | null;
  busy: boolean;
  error: string;
  audit: { action: string; revision: number; createdAt: string; verificationImpact: string }[];
  onAuth: (action: 'register' | 'login', username: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onOpen: (id: string) => Promise<void>;
  onMigrate: () => Promise<void>;
  onAudit: (id: string) => Promise<void>;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'register' | 'login'>('login');
  return <section className="account-card" aria-label="Account and saved workbooks">
    {user ? <>
      <div className="account-line">
        <span className="ws-avatar lg" aria-hidden="true">{user.username.slice(0, 1).toUpperCase()}</span>
        <div><strong>{user.username}</strong><small>Saved revisions are private to this account.</small></div>
        <button type="button" onClick={() => void onLogout()} disabled={busy}>Sign out</button>
      </div>
      <h3>Saved workbooks</h3>
      {workbooks.length ? <div className="workbook-list">{workbooks.map(item =>
        <div className={`workbook-item${selectedId === item.id ? ' is-open' : ''}`} key={item.id}>
          <div><strong>{item.title}</strong><small>Revision {item.revision}, {item.status === 'verified' ? 'verified' : 'totals on hold'}, {new Date(item.updatedAt).toLocaleString()}</small></div>
          <div className="button-row">
            <button type="button" className={selectedId === item.id ? '' : 'primary'} onClick={() => void onOpen(item.id)} disabled={busy}>{selectedId === item.id ? 'Reload' : 'Open'}</button>
            <button type="button" onClick={() => void onAudit(item.id)} disabled={busy}>History</button>
          </div>
        </div>)}</div> : <p className="fineprint">Nothing saved yet. Load a workbook, then use Save revision above the sheet.</p>}
      {audit.length > 0 && <div className="audit-list" aria-label="Workbook history">
        <h3>History</h3>
        <ol>{audit.map((entry, index) => <li key={`${entry.revision}-${index}`}>
          <strong>Revision {entry.revision}</strong>
          <span>{ACTION_LABELS[entry.action] ?? entry.action}, {IMPACT_LABELS[entry.verificationImpact] ?? entry.verificationImpact}</span>
          <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time>
        </li>)}</ol>
      </div>}
      <h3>Copy on this device</h3>
      <p className="fineprint">If you saved a workbook on this device before signing in, you can move a copy into your account. The device copy is kept.</p>
      <div className="button-row"><button type="button" onClick={() => void onMigrate()} disabled={busy}>Move this device's copy to my account</button></div>
    </> : <>
      <div className="auth-switch" role="group" aria-label="Account action">
        <button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>Sign in</button>
        <button type="button" aria-pressed={mode === 'register'} onClick={() => setMode('register')}>Create account</button>
      </div>
      <form className="auth-form" onSubmit={event => { event.preventDefault(); void onAuth(mode, username, password).then(() => setPassword('')); }}>
        <label>Username<input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={32} required autoFocus /></label>
        <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={12} required /></label>
        <button className="primary" type="submit" disabled={busy}>{mode === 'register' ? 'Create account' : 'Sign in'}</button>
      </form>
      <p className="fineprint">{mode === 'register' ? 'Usernames use letters, numbers, dashes or underscores. Passwords need at least 12 characters.' : 'Signing in lets you save private revisions and draft summaries with Ant Ling.'}</p>
    </>}
    {error && <p role="alert" className="error">{error}</p>}
  </section>;
}
