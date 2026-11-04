'use client';

import { useState } from 'react';

export type AccountUser = { id: string; username: string };
export type WorkbookItem = { id: string; title: string; revision: number; status: string; updatedAt: string };

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
  return <section className="account-card" aria-label="Private workbook storage">
    <div className="controls-heading"><h2>Private workbook storage</h2><p>Private account · versioned server snapshots · browser-local copies stay available on this site.</p></div>
    {user ? <>
      <div className="account-line"><strong>Signed in as {user.username}</strong><button type="button" onClick={() => void onLogout()} disabled={busy}>Sign out</button></div>
      <div className="button-row"><button type="button" onClick={() => void onMigrate()} disabled={busy}>Import browser-local workbook to server</button></div>
      <p className="fineprint">Import reads this site's browser-local copy and creates a new private workbook without deleting it. Browser storage from localhost is unavailable here; upload the original CSVs on this site. Browser-local data is shared by this browser profile; server workbooks are account-scoped.</p>
      <h3>My workbooks</h3>
      {workbooks.length ? <div className="workbook-list">{workbooks.map(item =>
        <div className="workbook-item" key={item.id}>
          <div><strong>{item.title}</strong><small>Revision {item.revision} · {item.status} · {new Date(item.updatedAt).toLocaleString()}</small></div>
          <div className="button-row"><button type="button" onClick={() => void onOpen(item.id)} disabled={busy}>{selectedId === item.id ? 'Reload' : 'Open'}</button><button type="button" onClick={() => void onAudit(item.id)} disabled={busy}>Audit</button></div>
        </div>)}</div> : <p className="fineprint">No private workbooks yet. Import this site's browser-local copy or save the current editor.</p>}
      {audit.length > 0 && <div className="audit-list" aria-label="Workbook audit trail"><h3>Audit trail</h3>{audit.map((entry, index) => <p key={`${entry.revision}-${index}`}>Revision {entry.revision} · {entry.action} · {entry.verificationImpact} · {new Date(entry.createdAt).toLocaleString()}</p>)}</div>}
    </> : <>
      <div className="auth-switch"><button type="button" aria-pressed={mode === 'login'} onClick={() => setMode('login')}>Sign in</button><button type="button" aria-pressed={mode === 'register'} onClick={() => setMode('register')}>Create account</button></div>
      <form className="auth-form" onSubmit={event => { event.preventDefault(); void onAuth(mode, username, password).then(() => setPassword('')); }}>
        <label>Username<input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={32} required /></label>
        <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={12} required /></label>
        <button className="primary" type="submit" disabled={busy}>{mode === 'register' ? 'Create account' : 'Sign in'}</button>
      </form>
    </>}
    {error && <p role="alert" className="error">{error}</p>}
  </section>;
}
