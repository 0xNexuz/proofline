# Proofline project context

## Current state

- **Date:** 2026-11-04
- **Stage/status:** P2 authenticated storage and audit implemented. Local SQLite and hosted PostgreSQL paths verified; structural row operations remain restricted.
- **Workspace:** `proofline-starter` on Windows. P1 baseline `6a3f38f` on `main`; P2 branch `p2/server-storage-audit` pushed to private `https://github.com/0xNexuz/proofline` with default branch P2. Hosted demo: `https://proofline-alpha.vercel.app/`.
- **Last verified milestone:** M-012 final production alias and post-deploy API data continuity. Hosted edit → revalidate → save revision 2 → page reload/open → audit is in M-011; screenshot `docs/evidence/p2-vercel-live.png`.
- **Local server at last check:** Stopped after production build and verification. `npm run dev` starts loopback development server.
- **Approved scope:** Owner explicitly authorized GitHub push and Vercel deployment. Free Neon PostgreSQL resource `proofline-db` is connected. No paid plan, custom domain, broader client scope, or Pro entitlement was authorized.

## Architecture and boundaries

- Next.js 15.5.28, React 19.3.1, TypeScript, and coordinated Univer OSS SDK packages at matching 1.3.1. Their separately versioned icon dependency is `@univerjs/icons@1.46.0`.
- `lib/finance.ts` parses untrusted CSVs and computes integer-cent figures. `components/UniverPanel.tsx` renders a real client-only Univer editor, imports values/formulas through its Facade API, subscribes to documented public events, and saves/restores a browser-local workbook snapshot.
- `lib/verification.ts` reads current source cells and formulas from public Facade ranges, remaps IDs to sheet rows, validates through the deterministic engine, and manages verified/stale/invalid states. `components/ClaimInspector.tsx` links methods, prior/current values, and supporting rows to each claim. Stale or invalid state withholds current summary cards.
- `lib/server/snapshot.ts` validates raw Univer snapshots and independently reuses the integer-cent engine. It converts supported formatted ISO date serials for P1 migration. `lib/server/store.ts` uses Node SQLite transactions locally and selects `lib/server/postgres-store.ts` for hosted PostgreSQL. Both implement private versioned snapshots, normalized source/budget/claim records, owner checks, revision conflicts, retry keys and append-only audit. `lib/server/auth.ts` supplies salted scrypt password hashes, hashed session tokens and HttpOnly cookies. API routes enforce account ownership and same-origin writes.
- Signed-in users explicitly open private workbooks; same-origin P1 localStorage is imported only by user action and retained. Localhost browser storage is not readable from the Vercel origin; original CSVs can be uploaded on the hosted site. The local database is ignored under `.proofline-data/`. Server schema is version 2; workbook snapshot schema is version 1. Hosted backup/restore and external security assessment remain open.
- Recognized structural row/column/range and sort commands in Univer withhold current claims until a fresh validated import. The server records such revisions as invalid. Any server-invalid revision stays invalid on client reload. Source-cell paste is independently revalidated.
- Ant Ling is user-reported coding-workflow assistance; no Proofline runtime integration exists. No commercial Univer feature or license key is used.

## Verification

| Check | Result |
|---|---|
| Dependency installation | Passed with project-local npm cache; 142 packages |
| `npm test` | 17/17 passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed after project-root tracing fix |
| Browser import/formulas | Real Univer editor; uploaded sample CSVs; exact P0 totals and formula value observed |
| Browser validation | Duplicate transaction ID rejected at CSV row 3 |
| Browser persistence | Edited E16 80→85, formula recalculated, save/reload restored both |
| Browser error log | Empty during final verification |
| P1 browser edit/inspect | E11 250→300; total actual 2135→2185; previous/current values and T-001 source row 11 shown |
| P1 browser invalidation | Duplicate T-001 at sheet row 12 and 640.001 amount withheld current totals; repair restored verification |
| P1 browser persistence | Saved edited 2185 workbook; reload withheld totals during revalidation, then restored verified 2185 |
| P1 evidence | Three full-page JPGs in `docs/evidence/` |
| P1 browser record removal | Clearing `A16:E16` reduced actual 2185→2105 and six transactions→five; Outreach claim 80→0, no current sources; saved snapshot reload restored 2185 |
| P2 tests | 25/25 passed: finance, edit revalidation, snapshot validation, serial dates, ownership, conflicts, idempotency, migration, audit, malformed data, throttling and structural restrictions |
| P2 typecheck/build | Passed; Next.js 15.5.28 build exposes four server API routes |
| P2 browser save/reload | Real Univer E11 300→310; stale then verified actual 2195; private revision 2 saved and reloaded with T-001 310 and audit entries |
| P2 browser isolation | Second synthetic account listed no first-account workbooks; direct foreign workbook API returned `Workbook not found`; signed-in reload starts with no private claims until explicit open |
| P2 structural safety | Physical row 11 delete and blank-row insert withheld claims; invalid deleted-row revision 3 stayed invalid after save/reload. Drag selection did not rearrange rows. Source-cell paste revalidated 2190 in an earlier check |
| P2 evidence | `docs/evidence/p2-private-revision-audit.jpg`, `p2-access-denied.jpg`, `p2-row-delete-withheld.jpg` |

The private GitHub remote and Vercel deployment were created under owner authorization. Local tracked-file and screenshot review found no secret, commercial license, or private customer data. The hosted page and saved evidence use synthetic records only.

## Decisions and next action

### 2026-11-03 — Keep P0 within local OSS scope

- **Decision:** Use the real OSS Univer editor and browser-local snapshots; leave licensed features, server persistence, and Ant Ling runtime inference for separately approved work.
- **Reason:** The current authorization is P0, while client scope and license entitlements remain unresolved.
- **Evidence:** M-003 local tests and browser verification; `docs/CLIENT_SCOPE.md`.
- **Status:** APPROVED for this P0 implementation.

### 2026-11-03 — P1 local revalidation and provenance

- **Decision:** Use public Univer 1.3.1 events and range APIs for edit detection; independently certify only validated literal source cells using Proofline's integer-cent engine. Mark claims stale immediately and withhold current values until success.
- **Reason:** Univer's visible formulas are useful in the editable workbook, while financial claim certification needs a deterministic source-based path and explicit invalidation.
- **Evidence:** M-005 tests, browser flow, and durable screenshots.
- **Status:** VERIFIED locally. The client has not approved deployment, publishing, merge, or push.
- **Integration limit:** Physical sheet-row deletion is covered by the grid-adapter unit test; the live browser check covered clearing a source record, not an actual row-delete command. See M-006.

### 2026-11-04 — P2 local storage and audit

- **Decision:** Use local Node SQLite as the justified development equivalent of PostgreSQL; keep browser-local P1 data, require explicit import, and fail closed on unsupported structural operations.
- **Reason:** This verifies ownership, independent server calculation, revisions and audit without paid or hosted resources. Client data boundaries and license entitlements remain unresolved.
- **Evidence:** M-008, I-008 and I-010; 25 tests; production browser evidence.
- **Status:** VERIFIED locally. Actual drag-based row rearrangement, hosted storage, external security assessment, backup operations, client licensing and deployment are open.

### 2026-11-04 — Hosted P2 demo

- **Decision:** Use a dedicated free Neon PostgreSQL resource for Vercel, retain local SQLite for development, and publish the P2 branch to a private GitHub repository. `proofline.vercel.app` was unavailable; `proofline-alpha.vercel.app` is the assigned short alias.
- **Evidence:** `tests/postgres.integration.mjs` against the dedicated Neon resource; hosted registration and real Univer edit E11 250→305, verified actual 2135→2190, revision 1→2, page reload/open, audit entries and screenshot `docs/evidence/p2-vercel-live.png`.
- **Status:** Hosted flow verified with synthetic data. No customer-data production assurance or backup recovery test is claimed.

**Next stage:** P3 should define production data boundaries and backups, add tested cross-origin migration/export if required, and certify more structural editing operations. Ant Ling runtime inference and Univer Pro remain separate approval and entitlement decisions.
