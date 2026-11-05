import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { inspectSnapshot, SNAPSHOT_SCHEMA_VERSION } from './snapshot.ts';
import { StoreError } from './errors.ts';
import { PostgresStore } from './postgres-store.ts';
export { StoreError } from './errors.ts';

type UserRow = { id: string; username: string; password_salt: string; password_hash: string };
type WorkbookRow = { id: string; owner_id: string; title: string; workbook_unit_id: string; current_revision: number; created_at: string; updated_at: string };
type RevisionRow = { revision: number; snapshot_json: string; status: string; error: string | null; schema_version: number; created_at: string; actual_total_cents: number | null; budget_total_cents: number | null };
type AuditRow = { id: number; actor_id: string; action: string; record_ids_json: string; before_json: string | null; after_json: string; verification_impact: string; created_at: string; revision: number };
const now = () => new Date().toISOString();

export class ProoflineStore {
  readonly db: DatabaseSync;

  constructor(file: string) {
    if (file !== ':memory:') {
      mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    }
    this.db = new DatabaseSync(file, { timeout: 5000 });
    if (file !== ':memory:') {
      try { chmodSync(file, 0o600); } catch { /* Windows permissions inherit from the user profile. */ }
    }
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    this.migrate();
  }

  close() { this.db.close(); }

  private migrate() {
    const version = (this.db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
    if (version > 2) throw new Error('Proofline database schema is newer than this application');
    if (version === 0) this.db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE workbooks (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL, workbook_unit_id TEXT NOT NULL, current_revision INTEGER NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX workbooks_owner ON workbooks(owner_id, updated_at);
      CREATE TABLE revisions (workbook_id TEXT NOT NULL REFERENCES workbooks(id), revision INTEGER NOT NULL,
        schema_version INTEGER NOT NULL, snapshot_json TEXT NOT NULL, snapshot_sha256 TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('verified','invalid')), error TEXT,
        actual_total_cents INTEGER, budget_total_cents INTEGER, actor_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL, PRIMARY KEY(workbook_id, revision));
      CREATE TABLE revision_transactions (workbook_id TEXT NOT NULL, revision INTEGER NOT NULL,
        transaction_id TEXT NOT NULL, source_row INTEGER NOT NULL, date TEXT NOT NULL,
        category TEXT NOT NULL, description TEXT NOT NULL, amount_cents INTEGER NOT NULL,
        PRIMARY KEY(workbook_id, revision, transaction_id),
        FOREIGN KEY(workbook_id,revision) REFERENCES revisions(workbook_id,revision));
      CREATE TABLE revision_claims (workbook_id TEXT NOT NULL, revision INTEGER NOT NULL,
        claim_id TEXT NOT NULL, method TEXT NOT NULL, value_cents INTEGER NOT NULL,
        source_ids_json TEXT NOT NULL, PRIMARY KEY(workbook_id,revision,claim_id),
        FOREIGN KEY(workbook_id,revision) REFERENCES revisions(workbook_id,revision));
      CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, workbook_id TEXT NOT NULL REFERENCES workbooks(id),
        revision INTEGER NOT NULL, actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL,
        record_ids_json TEXT NOT NULL, before_json TEXT, after_json TEXT NOT NULL,
        verification_impact TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT, 'audit entries are append-only'); END;
      CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT, 'audit entries are append-only'); END;
      CREATE TABLE idempotency (owner_id TEXT NOT NULL REFERENCES users(id), request_key TEXT NOT NULL,
        request_sha256 TEXT NOT NULL, response_json TEXT NOT NULL, PRIMARY KEY(owner_id, request_key));
      PRAGMA user_version = 1;
      COMMIT;
    `);
    if (version <= 1) this.db.exec(`
      BEGIN IMMEDIATE;
      CREATE TABLE login_attempts (username TEXT PRIMARY KEY COLLATE NOCASE, failures INTEGER NOT NULL,
        first_at TEXT NOT NULL, locked_until TEXT);
      CREATE TABLE revision_budgets (workbook_id TEXT NOT NULL, revision INTEGER NOT NULL,
        category TEXT NOT NULL, source_row INTEGER NOT NULL, budget_cents INTEGER NOT NULL,
        PRIMARY KEY(workbook_id,revision,category),
        FOREIGN KEY(workbook_id,revision) REFERENCES revisions(workbook_id,revision));
      PRAGMA user_version = 2;
      COMMIT;
    `);
  }

  createUser(username: string, salt: string, passwordHash: string) {
    const id = randomUUID();
    try {
      this.db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(id, username, salt, passwordHash, now());
    } catch {
      throw new StoreError('conflict', 'Username is unavailable');
    }
    return { id, username };
  }

  findUser(username: string): UserRow | undefined {
    return this.db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username) as UserRow | undefined;
  }

  assertLoginAllowed(username: string) {
    const row = this.db.prepare('SELECT locked_until FROM login_attempts WHERE username=? COLLATE NOCASE')
      .get(username) as { locked_until: string | null } | undefined;
    if (row?.locked_until && row.locked_until > now()) {
      throw new StoreError('rate_limited', 'Too many attempts. Try again later.');
    }
  }

  recordLoginFailure(username: string) {
    const row = this.db.prepare('SELECT failures,first_at FROM login_attempts WHERE username=? COLLATE NOCASE')
      .get(username) as { failures: number; first_at: string } | undefined;
    const timestamp = now();
    const recent = row && Date.now() - Date.parse(row.first_at) < 15 * 60_000;
    const failures = recent ? row.failures + 1 : 1;
    const firstAt = recent ? row.first_at : timestamp;
    const lockedUntil = failures >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
    this.db.prepare(`INSERT INTO login_attempts VALUES (?,?,?,?) ON CONFLICT(username)
      DO UPDATE SET failures=excluded.failures,first_at=excluded.first_at,locked_until=excluded.locked_until`)
      .run(username, failures, firstAt, lockedUntil);
  }

  recordLoginSuccess(username: string) {
    this.db.prepare('DELETE FROM login_attempts WHERE username=? COLLATE NOCASE').run(username);
  }

  createSession(userId: string, tokenHash: string, expiresAt: string) {
    this.db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(tokenHash, userId, expiresAt, now());
  }

  sessionUser(tokenHash: string): { id: string; username: string } | null {
    const row = this.db.prepare(`SELECT u.id, u.username FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.expires_at>?`).get(tokenHash, now()) as { id: string; username: string } | undefined;
    return row ?? null;
  }

  deleteSession(tokenHash: string) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash);
  }

  listWorkbooks(ownerId: string) {
    return this.db.prepare(`SELECT w.id,w.title,w.workbook_unit_id AS workbookUnitId,w.current_revision AS revision,
      w.updated_at AS updatedAt,r.status,r.actual_total_cents AS actualTotalCents,r.budget_total_cents AS budgetTotalCents
      FROM workbooks w JOIN revisions r ON r.workbook_id=w.id AND r.revision=w.current_revision
      WHERE w.owner_id=? ORDER BY w.updated_at DESC`).all(ownerId);
  }

  private owned(ownerId: string, workbookId: string): WorkbookRow {
    const row = this.db.prepare('SELECT * FROM workbooks WHERE id=? AND owner_id=?').get(workbookId, ownerId) as WorkbookRow | undefined;
    if (!row) throw new StoreError('not_found', 'Workbook not found');
    return row;
  }

  getWorkbook(ownerId: string, workbookId: string, revision?: number) {
    const workbook = this.owned(ownerId, workbookId);
    const selected = revision ?? workbook.current_revision;
    const row = this.db.prepare('SELECT * FROM revisions WHERE workbook_id=? AND revision=?').get(workbookId, selected) as RevisionRow | undefined;
    if (!row) throw new StoreError('not_found', 'Workbook revision not found');
    return { id: workbook.id, title: workbook.title, workbookUnitId: workbook.workbook_unit_id,
      revision: row.revision, currentRevision: workbook.current_revision, schemaVersion: row.schema_version,
      status: row.status, error: row.error, actualTotalCents: row.actual_total_cents,
      budgetTotalCents: row.budget_total_cents, createdAt: row.created_at,
      snapshot: JSON.parse(row.snapshot_json) as unknown };
  }

  /** Appends a report approval to the workbook's append-only audit trail. Only the latest revision can be approved. */
  recordReportApproval(ownerId: string, workbookId: string, revision: number,
    approval: { verifiedFigures: number; textSha256: string; text: string; recordIds: string[] }) {
    const workbook = this.owned(ownerId, workbookId);
    if (workbook.current_revision !== revision) {
      throw new StoreError('conflict', 'A newer revision exists. Check the report against it before approving.');
    }
    const approvedAt = new Date().toISOString();
    this.db.prepare('INSERT INTO audit(workbook_id,revision,actor_id,action,record_ids_json,before_json,after_json,verification_impact,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(workbookId, revision, ownerId, 'report_approved', JSON.stringify(approval.recordIds), null,
        JSON.stringify({ verifiedFigures: approval.verifiedFigures, textSha256: approval.textSha256, text: approval.text }),
        'figures_verified', approvedAt);
    return { workbookId, revision, approvedAt };
  }

  getAudit(ownerId: string, workbookId: string) {
    this.owned(ownerId, workbookId);
    const rows = this.db.prepare('SELECT * FROM audit WHERE workbook_id=? ORDER BY id').all(workbookId) as AuditRow[];
    return rows.map(row => ({ id: row.id, revision: row.revision, actorId: row.actor_id,
      action: row.action, recordIds: JSON.parse(row.record_ids_json) as string[],
      before: row.before_json ? JSON.parse(row.before_json) as unknown : null,
      after: JSON.parse(row.after_json) as unknown, verificationImpact: row.verification_impact,
      createdAt: row.created_at }));
  }

  save(input: { ownerId: string; actorId: string; workbookId?: string; expectedRevision?: number;
    title: string; snapshot: unknown; idempotencyKey: string; unsupportedOperation?: boolean; migration?: boolean }) {
    if (!/^[0-9a-f-]{36}$/i.test(input.idempotencyKey)) throw new StoreError('invalid', 'Invalid idempotency key');
    if (!input.title.trim() || input.title.length > 120) throw new StoreError('invalid', 'Workbook title must be 1–120 characters');
    let inspected: ReturnType<typeof inspectSnapshot>;
    try { inspected = inspectSnapshot(input.snapshot, input.unsupportedOperation); }
    catch (error) { throw new StoreError('invalid', error instanceof Error ? error.message : 'Malformed workbook snapshot'); }
    const requestHash = createHash('sha256').update(JSON.stringify({ workbookId: input.workbookId,
      expectedRevision: input.expectedRevision, title: input.title, snapshotHash: inspected.sha256,
      unsupportedOperation: input.unsupportedOperation, migration: input.migration })).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const replay = this.db.prepare('SELECT request_sha256,response_json FROM idempotency WHERE owner_id=? AND request_key=?')
        .get(input.ownerId, input.idempotencyKey) as { request_sha256: string; response_json: string } | undefined;
      if (replay) {
        if (replay.request_sha256 !== requestHash) throw new StoreError('conflict', 'Idempotency key was used for a different request');
        this.db.exec('COMMIT');
        return JSON.parse(replay.response_json) as { id: string; revision: number; status: string; error: string | null };
      }
      const timestamp = now();
      let workbookId = input.workbookId;
      let revision = 1;
      let before: unknown = null;
      if (workbookId) {
        const existing = this.owned(input.ownerId, workbookId);
        if (input.expectedRevision !== existing.current_revision) {
          throw new StoreError('conflict', `Revision conflict: current revision is ${existing.current_revision}`);
        }
        if (existing.workbook_unit_id !== inspected.workbookUnitId) {
          throw new StoreError('conflict', 'Univer workbook identifier changed; save as a new workbook');
        }
        const previous = this.getWorkbook(input.ownerId, workbookId);
        before = this.auditState(previous.status, previous.revision, previous.actualTotalCents,
          previous.budgetTotalCents, this.transactionRows(workbookId, previous.revision),
          this.claimRows(workbookId, previous.revision));
        revision = existing.current_revision + 1;
        this.db.prepare('UPDATE workbooks SET title=?,current_revision=?,updated_at=? WHERE id=?')
          .run(input.title.trim(), revision, timestamp, workbookId);
      } else {
        if (input.expectedRevision !== undefined && input.expectedRevision !== 0) {
          throw new StoreError('invalid', 'A new workbook must start at revision zero');
        }
        workbookId = randomUUID();
        this.db.prepare('INSERT INTO workbooks VALUES (?,?,?,?,?,?,?)')
          .run(workbookId, input.ownerId, input.title.trim(), inspected.workbookUnitId, revision, timestamp, timestamp);
      }
      this.db.prepare('INSERT INTO revisions VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .run(workbookId, revision, SNAPSHOT_SCHEMA_VERSION, inspected.snapshotJson, inspected.sha256,
          inspected.status, inspected.error, inspected.analysis?.actualTotalCents ?? null,
          inspected.analysis?.budgetTotalCents ?? null, input.actorId, timestamp);
      for (const tx of inspected.analysis?.transactions ?? []) {
        this.db.prepare('INSERT INTO revision_transactions VALUES (?,?,?,?,?,?,?,?)')
          .run(workbookId, revision, tx.id, tx.sourceRow, tx.date, tx.category, tx.description, tx.amountCents);
      }
      for (const budget of inspected.analysis?.budgets ?? []) {
        this.db.prepare('INSERT INTO revision_budgets VALUES (?,?,?,?,?)')
          .run(workbookId, revision, budget.category, budget.sourceRow, budget.budgetCents);
      }
      for (const claim of inspected.claims) {
        if (claim.valueCents === null) continue;
        this.db.prepare('INSERT INTO revision_claims VALUES (?,?,?,?,?,?)')
          .run(workbookId, revision, claim.id, claim.method, claim.valueCents,
            JSON.stringify(claim.sourceRecords.map(tx => tx.id)));
      }
      const after = this.auditState(inspected.status, revision, inspected.analysis?.actualTotalCents ?? null,
        inspected.analysis?.budgetTotalCents ?? null, inspected.analysis?.transactions ?? [], inspected.claims);
      const beforeIds = new Set((before as { sourceRecords?: { id: string }[] } | null)?.sourceRecords?.map(tx => tx.id) ?? []);
      const afterIds = new Set(inspected.analysis?.transactions.map(tx => tx.id) ?? []);
      const recordIds = [...new Set([...beforeIds, ...afterIds])];
      const action = input.migration ? 'local_import' : revision === 1 ? 'workbook_created' : 'workbook_saved';
      const impact = inspected.status === 'invalid' ? 'claims_withheld' : before === null ? 'claims_verified' : 'claims_recalculated';
      this.db.prepare('INSERT INTO audit(workbook_id,revision,actor_id,action,record_ids_json,before_json,after_json,verification_impact,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(workbookId, revision, input.actorId, action, JSON.stringify(recordIds),
          before === null ? null : JSON.stringify(before), JSON.stringify(after), impact, timestamp);
      const response = { id: workbookId, revision, status: inspected.status, error: inspected.error };
      this.db.prepare('INSERT INTO idempotency VALUES (?,?,?,?)')
        .run(input.ownerId, input.idempotencyKey, requestHash, JSON.stringify(response));
      this.db.exec('COMMIT');
      return response;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private transactionRows(workbookId: string, revision: number) {
    return this.db.prepare(`SELECT transaction_id AS id,source_row AS sourceRow,date,category,description,
      amount_cents AS amountCents FROM revision_transactions WHERE workbook_id=? AND revision=? ORDER BY source_row`)
      .all(workbookId, revision) as { id: string; sourceRow: number; date: string; category: string; description: string; amountCents: number }[];
  }

  private claimRows(workbookId: string, revision: number) {
    return this.db.prepare('SELECT claim_id AS id,method,value_cents AS valueCents,source_ids_json AS sourceIds FROM revision_claims WHERE workbook_id=? AND revision=?')
      .all(workbookId, revision);
  }

  private auditState(status: string, revision: number, actualTotalCents: number | null,
    budgetTotalCents: number | null, sourceRecords: unknown[], claims: unknown[]) {
    return { status, revision, actualTotalCents, budgetTotalCents, sourceRecords, claims };
  }
}

let singleton: ProoflineStore | PostgresStore | null = null;
export function getStore() {
  if (!singleton) {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (databaseUrl) singleton = new PostgresStore(databaseUrl);
    else {
      if (process.env.VERCEL) throw new Error('Hosted Proofline requires DATABASE_URL or POSTGRES_URL');
      const dataDir = process.env.PROOFLINE_DATA_DIR || path.join(process.cwd(), '.proofline-data');
      singleton = new ProoflineStore(path.join(dataDir, 'proofline.sqlite'));
    }
  }
  return singleton;
}
