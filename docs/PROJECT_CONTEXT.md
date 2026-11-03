# Proofline project context

## Current state

- **Date:** 2026-11-03
- **Stage/status:** P1 development and verification complete locally within the documented browser-local scope.
- **Workspace:** Extracted `proofline-starter` folder on Windows. It has no `.git` repository, branch, HEAD, remote, commit, or push.
- **Last verified milestone:** M-006 in `docs/BUILD_LEDGER.md` (P1 completion is M-005).
- **Local server at last check:** Production build running at `http://localhost:3000` (background npm PID 18860); process lifetime is local to this computer session.
- **Approved scope:** Local P0 and P1 implementation and verification. No deployment or push authorized.

## Architecture and boundaries

- Next.js 15.5.28, React 19.3.1, TypeScript, and coordinated Univer OSS SDK packages at matching 1.3.1. Their separately versioned icon dependency is `@univerjs/icons@1.46.0`.
- `lib/finance.ts` parses untrusted CSVs and computes integer-cent figures. `components/UniverPanel.tsx` renders a real client-only Univer editor, imports values/formulas through its Facade API, subscribes to documented public events, and saves/restores a browser-local workbook snapshot.
- `lib/verification.ts` reads current source cells and formulas from public Facade ranges, remaps IDs to sheet rows, validates through the deterministic engine, and manages verified/stale/invalid states. `components/ClaimInspector.tsx` links methods, prior/current values, and supporting rows to each claim. Stale or invalid state withholds current summary cards.
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

The extracted folder has no GitHub remote to inspect for secrets. See `docs/ACCEPTANCE.md` for the open GitHub evidence item.

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

**Next stage:** P2 can define server-side persistence, authentication, audit history, larger datasets, schema/import breadth, and report generation once client data boundaries, license entitlements, ownership and acceptance are documented. Ant Ling runtime inference remains a separate integration decision.
