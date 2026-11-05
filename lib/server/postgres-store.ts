import { createHash, randomUUID } from 'node:crypto';
import pg, { type PoolClient } from 'pg';
import { StoreError } from './errors.ts';
import { inspectSnapshot, SNAPSHOT_SCHEMA_VERSION } from './snapshot.ts';

const { Pool } = pg;
const now = () => new Date().toISOString();

type UserRow = { id: string; username: string; password_salt: string; password_hash: string };
type WorkbookRow = { id: string; owner_id: string; title: string; workbook_unit_id: string; current_revision: number; created_at: string; updated_at: string };
type RevisionRow = { revision: number; snapshot_json: string; status: string; error: string | null; schema_version: number; created_at: string; actual_total_cents: string | null; budget_total_cents: string | null };
type AuditRow = { id: number; actor_id: string; action: string; record_ids_json: string; before_json: string | null; after_json: string; verification_impact: string; created_at: string; revision: number };
type SaveInput = { ownerId: string; actorId: string; workbookId?: string; expectedRevision?: number;
  title: string; snapshot: unknown; idempotencyKey: string; unsupportedOperation?: boolean; migration?: boolean };

/** Hosted adapter. Snapshot and claim validation is shared with the local SQLite store. */
export class PostgresStore {
  private readonly pool: pg.Pool;
  private readonly ready: Promise<void>;

  constructor(connectionString: string) {
    const secureUrl = new URL(connectionString);
    secureUrl.searchParams.set('sslmode', 'verify-full');
    this.pool = new Pool({ connectionString: secureUrl.toString(), max: 2, connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000, ssl: { rejectUnauthorized: true } });
    this.ready = this.migrate();
  }

  async close() { await this.pool.end(); }

  private async migrate() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(72777351)');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
          password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users(lower(username));
        CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
          expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS workbooks (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
          title TEXT NOT NULL, workbook_unit_id TEXT NOT NULL, current_revision INTEGER NOT NULL,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS workbooks_owner ON workbooks(owner_id, updated_at);
        CREATE TABLE IF NOT EXISTS revisions (workbook_id TEXT NOT NULL REFERENCES workbooks(id), revision INTEGER NOT NULL,
          schema_version INTEGER NOT NULL, snapshot_json TEXT NOT NULL, snapshot_sha256 TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('verified','invalid')), error TEXT,
          actual_total_cents BIGINT, budget_total_cents BIGINT, actor_id TEXT NOT NULL REFERENCES users(id),
          created_at TEXT NOT NULL, PRIMARY KEY(workbook_id, revision));
        CREATE TABLE IF NOT EXISTS revision_transactions (workbook_id TEXT NOT NULL, revision INTEGER NOT NULL,
          transaction_id TEXT NOT NULL, source_row INTEGER NOT NULL, date TEXT NOT NULL,
          category TEXT NOT NULL, description TEXT NOT NULL, amount_cents BIGINT NOT NULL,
          PRIMARY KEY(workbook_id, revision, transaction_id),
          FOREIGN KEY(workbook_id,revision) REFERENCES revisions(workbook_id,revision));
        CREATE TABLE IF NOT EXISTS revision_budgets (workbook_id TEXT NOT NULL, revision INTEGER NOT NULL,
          category TEXT NOT NULL, source_row INTEGER NOT NULL, budget_cents BIGINT NOT NULL,
          PRIMARY KEY(workbook_id,revision,category),
          FOREIGN KEY(workbook_id,revision) REFERENCES revisions(workbook_id,revision));
        CREATE TABLE IF NOT EXISTS revision_claims (workbook_id TEXT NOT NULL, revision INTEGER NOT NULL,
          claim_id TEXT NOT NULL, method TEXT NOT NULL, value_cents BIGINT NOT NULL,
          source_ids_json TEXT NOT NULL, PRIMARY KEY(workbook_id,revision,claim_id),
          FOREIGN KEY(workbook_id,revision) REFERENCES revisions(workbook_id,revision));
        CREATE TABLE IF NOT EXISTS audit (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
          workbook_id TEXT NOT NULL REFERENCES workbooks(id), revision INTEGER NOT NULL,
          actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL,
          record_ids_json TEXT NOT NULL, before_json TEXT, after_json TEXT NOT NULL,
          verification_impact TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS idempotency (owner_id TEXT NOT NULL REFERENCES users(id), request_key TEXT NOT NULL,
          request_sha256 TEXT NOT NULL, response_json TEXT NOT NULL, PRIMARY KEY(owner_id, request_key));
        CREATE TABLE IF NOT EXISTS login_attempts (username TEXT PRIMARY KEY, failures INTEGER NOT NULL,
          first_at TEXT NOT NULL, locked_until TEXT);
        CREATE UNIQUE INDEX IF NOT EXISTS login_attempts_username_lower ON login_attempts(lower(username));
        CREATE OR REPLACE FUNCTION reject_proofline_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
          BEGIN RAISE EXCEPTION 'audit entries are append-only'; END; $$;
        DROP TRIGGER IF EXISTS audit_no_mutation ON audit;
        CREATE TRIGGER audit_no_mutation BEFORE UPDATE OR DELETE ON audit
          FOR EACH ROW EXECUTE FUNCTION reject_proofline_audit_mutation();
      `);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async createUser(username: string, salt: string, passwordHash: string) {
    await this.ready;
    const id = randomUUID();
    try {
      await this.pool.query('INSERT INTO users VALUES ($1,$2,$3,$4,$5)', [id, username, salt, passwordHash, now()]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new StoreError('conflict', 'Username is unavailable');
      throw error;
    }
    return { id, username };
  }

  async findUser(username: string): Promise<UserRow | undefined> {
    await this.ready;
    const result = await this.pool.query<UserRow>('SELECT * FROM users WHERE lower(username)=lower($1)', [username]);
    return result.rows[0];
  }

  async assertLoginAllowed(username: string) {
    await this.ready;
    const result = await this.pool.query<{ locked_until: string | null }>(
      'SELECT locked_until FROM login_attempts WHERE lower(username)=lower($1)', [username]);
    if (result.rows[0]?.locked_until && result.rows[0].locked_until > now()) {
      throw new StoreError('rate_limited', 'Too many attempts. Try again later.');
    }
  }

  async recordLoginFailure(username: string) {
    await this.ready;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`login:${username.toLowerCase()}`]);
      const result = await client.query<{ failures: number; first_at: string }>(
        'SELECT failures,first_at FROM login_attempts WHERE lower(username)=lower($1) FOR UPDATE', [username]);
      const previous = result.rows[0];
      const recent = previous && Date.now() - Date.parse(previous.first_at) < 15 * 60_000;
      const failures = recent ? previous.failures + 1 : 1;
      const firstAt = recent ? previous.first_at : now();
      const lockedUntil = failures >= 5 ? new Date(Date.now() + 15 * 60_000).toISOString() : null;
      await client.query(`INSERT INTO login_attempts VALUES ($1,$2,$3,$4) ON CONFLICT(username)
        DO UPDATE SET failures=EXCLUDED.failures,first_at=EXCLUDED.first_at,locked_until=EXCLUDED.locked_until`,
      [username.toLowerCase(), failures, firstAt, lockedUntil]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async recordLoginSuccess(username: string) {
    await this.ready;
    await this.pool.query('DELETE FROM login_attempts WHERE lower(username)=lower($1)', [username]);
  }

  async createSession(userId: string, tokenHash: string, expiresAt: string) {
    await this.ready;
    await this.pool.query('INSERT INTO sessions VALUES ($1,$2,$3,$4)', [tokenHash, userId, expiresAt, now()]);
  }

  async sessionUser(tokenHash: string): Promise<{ id: string; username: string } | null> {
    await this.ready;
    const result = await this.pool.query<{ id: string; username: string }>(
      `SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id
       WHERE s.token_hash=$1 AND s.expires_at>$2`, [tokenHash, now()]);
    return result.rows[0] ?? null;
  }

  async deleteSession(tokenHash: string) {
    await this.ready;
    await this.pool.query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash]);
  }

  async listWorkbooks(ownerId: string) {
    await this.ready;
    const result = await this.pool.query(`SELECT w.id,w.title,w.workbook_unit_id,w.current_revision,
      w.updated_at,r.status,r.actual_total_cents,r.budget_total_cents FROM workbooks w
      JOIN revisions r ON r.workbook_id=w.id AND r.revision=w.current_revision
      WHERE w.owner_id=$1 ORDER BY w.updated_at DESC`, [ownerId]);
    return result.rows.map(row => ({ id: row.id, title: row.title, workbookUnitId: row.workbook_unit_id,
      revision: row.current_revision, updatedAt: row.updated_at, status: row.status,
      actualTotalCents: row.actual_total_cents === null ? null : Number(row.actual_total_cents),
      budgetTotalCents: row.budget_total_cents === null ? null : Number(row.budget_total_cents) }));
  }

  private async owned(ownerId: string, workbookId: string, client: PoolClient | pg.Pool = this.pool): Promise<WorkbookRow> {
    const result = await client.query<WorkbookRow>('SELECT * FROM workbooks WHERE id=$1 AND owner_id=$2', [workbookId, ownerId]);
    if (!result.rows[0]) throw new StoreError('not_found', 'Workbook not found');
    return result.rows[0];
  }

  async getWorkbook(ownerId: string, workbookId: string, revision?: number) {
    await this.ready;
    const workbook = await this.owned(ownerId, workbookId);
    const selected = revision ?? workbook.current_revision;
    const result = await this.pool.query<RevisionRow>(
      'SELECT * FROM revisions WHERE workbook_id=$1 AND revision=$2', [workbookId, selected]);
    const row = result.rows[0];
    if (!row) throw new StoreError('not_found', 'Workbook revision not found');
    return { id: workbook.id, title: workbook.title, workbookUnitId: workbook.workbook_unit_id,
      revision: row.revision, currentRevision: workbook.current_revision, schemaVersion: row.schema_version,
      status: row.status, error: row.error, actualTotalCents: row.actual_total_cents === null ? null : Number(row.actual_total_cents),
      budgetTotalCents: row.budget_total_cents === null ? null : Number(row.budget_total_cents), createdAt: row.created_at,
      snapshot: JSON.parse(row.snapshot_json) as unknown };
  }

  /** Appends a report approval to the workbook's append-only audit trail. Only the latest revision can be approved. */
  async recordReportApproval(ownerId: string, workbookId: string, revision: number,
    approval: { verifiedFigures: number; textSha256: string; text: string; recordIds: string[] }) {
    await this.ready;
    const workbook = await this.owned(ownerId, workbookId);
    if (Number(workbook.current_revision) !== revision) {
      throw new StoreError('conflict', 'A newer revision exists. Check the report against it before approving.');
    }
    const approvedAt = new Date().toISOString();
    await this.pool.query(`INSERT INTO audit(workbook_id,revision,actor_id,action,record_ids_json,before_json,after_json,verification_impact,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [workbookId, revision, ownerId, 'report_approved', JSON.stringify(approval.recordIds), null,
      JSON.stringify({ verifiedFigures: approval.verifiedFigures, textSha256: approval.textSha256, text: approval.text }),
      'figures_verified', approvedAt]);
    return { workbookId, revision, approvedAt };
  }

  async getAudit(ownerId: string, workbookId: string) {
    await this.ready;
    await this.owned(ownerId, workbookId);
    const result = await this.pool.query<AuditRow>('SELECT * FROM audit WHERE workbook_id=$1 ORDER BY id', [workbookId]);
    return result.rows.map(row => ({ id: Number(row.id), revision: row.revision, actorId: row.actor_id,
      action: row.action, recordIds: JSON.parse(row.record_ids_json) as string[],
      before: row.before_json ? JSON.parse(row.before_json) as unknown : null,
      after: JSON.parse(row.after_json) as unknown, verificationImpact: row.verification_impact,
      createdAt: row.created_at }));
  }

  async save(input: SaveInput) {
    await this.ready;
    if (!/^[0-9a-f-]{36}$/i.test(input.idempotencyKey)) throw new StoreError('invalid', 'Invalid idempotency key');
    if (!input.title.trim() || input.title.length > 120) throw new StoreError('invalid', 'Workbook title must be 1–120 characters');
    let inspected: ReturnType<typeof inspectSnapshot>;
    try { inspected = inspectSnapshot(input.snapshot, input.unsupportedOperation); }
    catch (error) { throw new StoreError('invalid', error instanceof Error ? error.message : 'Malformed workbook snapshot'); }
    const requestHash = createHash('sha256').update(JSON.stringify({ workbookId: input.workbookId,
      expectedRevision: input.expectedRevision, title: input.title, snapshotHash: inspected.sha256,
      unsupportedOperation: input.unsupportedOperation, migration: input.migration })).digest('hex');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`save:${input.ownerId}:${input.idempotencyKey}`]);
      const replay = await client.query<{ request_sha256: string; response_json: string }>(
        'SELECT request_sha256,response_json FROM idempotency WHERE owner_id=$1 AND request_key=$2',
        [input.ownerId, input.idempotencyKey]);
      if (replay.rows[0]) {
        if (replay.rows[0].request_sha256 !== requestHash) throw new StoreError('conflict', 'Idempotency key was used for a different request');
        await client.query('COMMIT');
        return JSON.parse(replay.rows[0].response_json) as { id: string; revision: number; status: string; error: string | null };
      }
      const timestamp = now();
      let workbookId = input.workbookId;
      let revision = 1;
      let before: { status: string; revision: number; actualTotalCents: number | null; budgetTotalCents: number | null;
        sourceRecords: unknown[]; claims: unknown[] } | null = null;
      if (workbookId) {
        const existingResult = await client.query<WorkbookRow>(
          'SELECT * FROM workbooks WHERE id=$1 AND owner_id=$2 FOR UPDATE', [workbookId, input.ownerId]);
        const existing = existingResult.rows[0];
        if (!existing) throw new StoreError('not_found', 'Workbook not found');
        if (input.expectedRevision !== existing.current_revision) {
          throw new StoreError('conflict', `Revision conflict: current revision is ${existing.current_revision}`);
        }
        if (existing.workbook_unit_id !== inspected.workbookUnitId) {
          throw new StoreError('conflict', 'Univer workbook identifier changed; save as a new workbook');
        }
        const previous = (await client.query<RevisionRow>(
          'SELECT * FROM revisions WHERE workbook_id=$1 AND revision=$2', [workbookId, existing.current_revision])).rows[0];
        const priorRecords = (await client.query(`SELECT transaction_id AS id,source_row AS "sourceRow",date,category,description,
          amount_cents AS "amountCents" FROM revision_transactions WHERE workbook_id=$1 AND revision=$2 ORDER BY source_row`,
        [workbookId, existing.current_revision])).rows.map(row => ({ ...row, amountCents: Number(row.amountCents) }));
        const priorClaims = (await client.query(`SELECT claim_id AS id,method,value_cents AS "valueCents",source_ids_json AS "sourceIds"
          FROM revision_claims WHERE workbook_id=$1 AND revision=$2`, [workbookId, existing.current_revision])).rows;
        before = { status: previous.status, revision: previous.revision,
          actualTotalCents: previous.actual_total_cents === null ? null : Number(previous.actual_total_cents),
          budgetTotalCents: previous.budget_total_cents === null ? null : Number(previous.budget_total_cents),
          sourceRecords: priorRecords, claims: priorClaims };
        revision = existing.current_revision + 1;
        await client.query('UPDATE workbooks SET title=$1,current_revision=$2,updated_at=$3 WHERE id=$4',
          [input.title.trim(), revision, timestamp, workbookId]);
      } else {
        if (input.expectedRevision !== undefined && input.expectedRevision !== 0) {
          throw new StoreError('invalid', 'A new workbook must start at revision zero');
        }
        workbookId = randomUUID();
        await client.query('INSERT INTO workbooks VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [workbookId, input.ownerId, input.title.trim(), inspected.workbookUnitId, revision, timestamp, timestamp]);
      }
      await client.query('INSERT INTO revisions VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
        [workbookId, revision, SNAPSHOT_SCHEMA_VERSION, inspected.snapshotJson, inspected.sha256,
          inspected.status, inspected.error, inspected.analysis?.actualTotalCents ?? null,
          inspected.analysis?.budgetTotalCents ?? null, input.actorId, timestamp]);
      for (const tx of inspected.analysis?.transactions ?? []) {
        await client.query('INSERT INTO revision_transactions VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
          [workbookId, revision, tx.id, tx.sourceRow, tx.date, tx.category, tx.description, tx.amountCents]);
      }
      for (const budget of inspected.analysis?.budgets ?? []) {
        await client.query('INSERT INTO revision_budgets VALUES ($1,$2,$3,$4,$5)',
          [workbookId, revision, budget.category, budget.sourceRow, budget.budgetCents]);
      }
      for (const claim of inspected.claims) {
        if (claim.valueCents === null) continue;
        await client.query('INSERT INTO revision_claims VALUES ($1,$2,$3,$4,$5,$6)',
          [workbookId, revision, claim.id, claim.method, claim.valueCents,
            JSON.stringify(claim.sourceRecords.map(tx => tx.id))]);
      }
      const after = { status: inspected.status, revision, actualTotalCents: inspected.analysis?.actualTotalCents ?? null,
        budgetTotalCents: inspected.analysis?.budgetTotalCents ?? null,
        sourceRecords: inspected.analysis?.transactions ?? [], claims: inspected.claims };
      const beforeIds = new Set((before?.sourceRecords as { id: string }[] | undefined)?.map(tx => tx.id) ?? []);
      const afterIds = new Set(inspected.analysis?.transactions.map(tx => tx.id) ?? []);
      const recordIds = [...new Set([...beforeIds, ...afterIds])];
      const action = input.migration ? 'local_import' : revision === 1 ? 'workbook_created' : 'workbook_saved';
      const impact = inspected.status === 'invalid' ? 'claims_withheld' : before === null ? 'claims_verified' : 'claims_recalculated';
      await client.query(`INSERT INTO audit(workbook_id,revision,actor_id,action,record_ids_json,before_json,after_json,verification_impact,created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [workbookId, revision, input.actorId, action,
        JSON.stringify(recordIds), before === null ? null : JSON.stringify(before), JSON.stringify(after), impact, timestamp]);
      const response = { id: workbookId, revision, status: inspected.status, error: inspected.error };
      await client.query('INSERT INTO idempotency VALUES ($1,$2,$3,$4)',
        [input.ownerId, input.idempotencyKey, requestHash, JSON.stringify(response)]);
      await client.query('COMMIT');
      return response;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}
