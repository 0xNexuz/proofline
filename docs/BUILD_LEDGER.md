# PROOFLINE — APPEND-ONLY BUILD LEDGER

This file is the shared record for questions, issues, decisions, milestones, evidence and public build stories. Update it on every Codex task. When the user brings a question or error to ChatGPT, also append its outcome here in the repository so no work is lost across tools or chats.

## Entries

### Q-001 | 2026-11-03 | Issue and learning tracking
- **Asked:** Keep all user questions, bugs, solutions, decisions and breakthroughs, then map to the Univer / Ant Ling / Builder contribution headings when projects conclude.
- **Decision:** Use this append-only log and `docs/CONTRIBUTION_MAP.md` as repo source of truth; memory is supportive but not a substitute for evidence.
- **Status:** Workflow specified. Future updates require sharing Codex task output or committing changes to GitHub; ChatGPT cannot independently observe all Codex sessions.
- **Public angle:** Show genuine build challenges rather than generic promotional announcements.

### D-001 | 2026-11-03 | Ant Ling usage boundary
- **Context:** Ant Ling API is configured in Codex for coding assistance.
- **Decision:** Describe Ant Ling as a **development assistant** until an authenticated, tested Ant Ling API call is integrated into the application backend.
- **Status:** Confirmed by user; app runtime not integrated.

### M-001 | 2026-11-03 | Initial standalone Proofline scaffold
- **Implemented in starter bundle:** Next.js + TypeScript UI; Univer Sheets editor integration based on official Next.js preset guide; budget/transaction CSV parsing; integer-cent, deterministic category totals; source transaction IDs; workbook formulas; browser-local snapshot save.
- **Tests run:** `npm test`: seven finance-engine tests passed in the preparation environment.
- **Not tested:** `npm install`, `npm run typecheck`, `npm run build`, and browser-based Univer operation. Dependency registry was unreachable in the preparation environment; these checks must run in Codex.
- **Known limitations:** Browser-local storage only; no sign-in, database, XLSX, cross-document report, automatic re-verification after editing, client license activation, or Ant Ling runtime calls. No live product has been launched.
- **Next:** Push repository, run dependency install and acceptance checks, resolve any issues, and record results.

### M-002 | 2026-11-03 | Local P0 foundation verification and repair
- **Source/trigger:** Owner requested complete local P0 verification, dependency installation, live Univer editing, CSV imports, calculations, persistence, and all available tests.
- **Expected:** A reproducible local editor and financial workbook satisfying `docs/ACCEPTANCE.md`, with failures and fixes recorded.
- **Status:** In progress. This extracted starter has no `.git` repository; no local commit or push is implied.
- **Evidence plan:** Record exact installed versions, command results, browser interaction, and sanitized screenshot paths. Keep Univer and Ant Ling credentials out of code and logs.

### I-001 | 2026-11-03 | Next.js build traces outside the extracted project
- **Source/trigger:** `npm run build` after successful install, seven tests, and typecheck.
- **Reproduction:** Run the build from `proofline-starter` while an unrelated `C:\Users\USER\package-lock.json` exists. Next.js 15.5.28 chooses that parent as its tracing root, then webpack fails with `EPERM: operation not permitted, readlink 'C:\Users\USER'`.
- **Expected:** Build traces only the extracted project and completes.
- **Decision:** Set the official `outputFileTracingRoot` option to this project directory. Re-run typecheck and build; result pending.
- **Status:** In progress.

### I-002 | 2026-11-03 | CSV parser accepts text after a closing quote
- **Source/trigger:** P0 review of untrusted financial CSV parsing.
- **Reproduction:** `parseCsv('a,b\n"foo"bar,baz')` currently treats malformed `"foo"bar` as a valid `foobar` cell.
- **Expected:** Reject malformed quoted fields so the imported workbook faithfully represents the source.
- **Decision:** Add a parser regression test, reject any non-separator character after a closing quote, and rerun all checks.
- **Status:** In progress.

## New-entry template (append; never rewrite history)

### [Q/I/D/M]-NNN | YYYY-MM-DD | Title
- **Source/trigger:** User question / Codex failure / test / client request.
- **Context:** What happened? Repro steps if bug.
- **Expected:** Observable outcome.
- **Actions:** Actual code/docs changed; commit/PR URL.
- **Evidence:** Tests, screenshots, recording, URLs, logs sanitized of secrets.
- **Result:** Verified / partial / blocked / planned.
- **Learning:** What changed in the engineering understanding.
- **Public post opportunity:** Univer / Ant Ling / Builder and exact evidence needed.

### I-003 | 2026-11-03 | npm default cache is outside writable project
- **Source/trigger:** First `npm install --no-audit --no-fund` on the extracted Windows starter.
- **Reproduction:** npm attempted to write under `C:\Users\USER\AppData\Local\npm-cache` and failed with `EPERM` before dependencies were installed.
- **Decision/fix:** Run `npm install --no-audit --no-fund --cache .npm-cache` and ignore `.npm-cache/` in `.gitignore`.
- **Evidence:** Installation succeeded: 142 packages added. npm reported one skipped optional `protobufjs` postinstall script; all app tests, build, and browser checks passed afterward.
- **Result:** Resolved locally; fresh install on another machine not yet verified.
- **Learning:** Keep the dependency cache inside the writable project in this managed Windows environment.

### D-002 | 2026-11-03 | P0 stays on OSS Univer and browser-local snapshots
- **Context:** The client scope and commercial entitlements remain undocumented. The owner authorized local P0, not licensed Pro features, server persistence, deployment, or Ant Ling runtime inference.
- **Decision:** Keep the coordinated Univer SDK packages at matching `1.3.1` while respecting their separately versioned `@univerjs/icons@1.46.0` dependency; use the real OSS Sheets editor and retain browser-local snapshot storage for P0. Make the verified CSV calculation and later workbook edits explicitly distinct.
- **Evidence:** Installed-package listing, Univer 1.3.1 official Next.js and Sheets API docs, successful local browser import/edit/save/reload.
- **Result:** Implemented and verified locally. P1 auth/server persistence and any Pro or Ant Ling runtime work require separately approved scope and entitlements.

### M-003 | 2026-11-03 | P0 foundation verified locally
- **Source/trigger:** Owner's P0 development request; resolves I-001, I-002, and I-003.
- **Changes:** Added `package-lock.json`, ignored the project-local npm cache, set Next.js `outputFileTracingRoot` to the project directory, rejected malformed characters after a closing CSV quote, added three finance regression tests and a duplicate-ID browser fixture, and refreshed README/acceptance/contribution records.
- **Commands and outcomes:** Node `v24.22.1`, npm `11.19.1`; `npm install --no-audit --no-fund --cache .npm-cache` passed (142 packages); `npm test` passed 10/10; `npm run typecheck` passed; `npm run build` passed; `npm run start` served HTTP 200 at `http://localhost:3000`. No lint script is defined.
- **SDK compatibility:** Installed `@univerjs/presets@1.3.1` and `@univerjs/preset-sheets-core@1.3.1`. The browser displayed the Univer toolbar, formula bar, grid canvas, and sheet tabs. The C4 formula bar showed `=SUMIF(C11:C16,A4,E11:E16)` with calculated value 890. The browser error log was empty.
- **CSV and arithmetic:** The two checked-in sample CSV files were uploaded through the browser file inputs. The UI showed 6 transactions, 4 categories, 3000.00 budget, 2135.00 actual, Logistics 890.00 against 700.00, and unbudgeted Outreach 80.00 with source IDs. Uploading `tests/fixtures/duplicate-transactions.csv` showed `Duplicate transaction ID T-001 at row 3` and did not replace the workbook. Unit tests cover invalid headers, repeated categories, unsafe spreadsheet text, invalid money, impossible dates, exact sample figures, and malformed quotes.
- **Persistence:** Changed transaction cell E16 from 80 to 85 in Univer; its formula row recalculated to 85. Saved locally, reloaded the page, and observed E16 and its formula result still at 85. Then restored and saved the clean synthetic sample.
- **Failed checks and fixes:** Initial npm install failed on the global cache (`EPERM`); initial build failed after Next.js selected an unrelated parent lockfile (`EPERM readlink C:\Users\USER`); a new CSV regression test failed before the parser fix. Each passed after the documented correction. First cold `npm run dev` compile took 135.6 seconds and timed out the first browser navigation; the optimized production server was used for live verification.
- **Security and evidence:** `.env.example` contains empty placeholders only; no `.env.local`, real key, Ant Ling runtime call, Pro feature, Git repository, commit, push, or deployment was found or created. Browser console errors: none. Univer screenshots were inspected within the Codex browser session but not saved as durable files; a screenshot/clip and GitHub secret review remain open acceptance items.
- **Result:** P0 functional acceptance verified locally. Browser-local storage is not server persistence; summary cards reflect imported CSVs and are not reverified after a workbook edit.
- **Next:** Capture durable demo evidence, establish the signed client scope and license entitlements, then plan P1 persistence/auth, source-level provenance, and edit revalidation.
- **Public post opportunity:** Show the real formula bar, source IDs, parser regression, and save/reload behavior only after media is saved and publication is approved. Describe Ant Ling as user-reported coding-workflow assistance, not Proofline runtime inference.

### I-004 | 2026-11-03 | Univer icon assets use a separate version sequence
- **Source/trigger:** Exact dependency-graph verification after the final build.
- **Observation:** The lockfile contains 21 coordinated `@univerjs/*` SDK packages at 1.3.1 and `@univerjs/icons` at 1.46.0. Six installed SDK package manifests explicitly require `@univerjs/icons: 1.46.0`.
- **Issue:** The original agent rule could be read as requiring the icon asset package at 1.3.1, which would conflict with Univer's own exact dependencies.
- **Decision/fix:** Clarified `AGENTS.md` and README to keep coordinated SDK releases matched while following the exact separately versioned icon dependency. No dependency override or runtime code change was needed.
- **Verification:** `npm test` 10/10, typecheck, build, and real browser import/edit/persistence had passed with the installed graph. The lockfile/manifests were inspected directly.
- **Learning:** Verify package relationships from the installed graph, not only the shared npm scope or a naming convention.

### I-005 | 2026-11-03 | Terminal-managed local server ended with its tool session
- **Source/trigger:** Final `http://localhost:3000` check after a tool-session change returned connection refused, although the earlier production browser verification had passed.
- **Reproduction:** The `npm run start` process launched in a terminal session was no longer present; this was a process-lifetime issue, not an application build error.
- **Fix:** Started the already-built Next.js production server as a hidden background Node process (PID 14292), with ignored local stdout/stderr logs.
- **Verification:** A new HTTP request returned 200 and the correct page title. A fresh browser tab displayed the actual Univer editor and restored the clean local workbook snapshot.
- **Result:** Resolved for the current local session. Restart with `npm run start` from the project folder if the background process stops after the computer/session changes.

### M-004 | 2026-11-03 | P1 workbook edit revalidation and claim provenance
- **Source/trigger:** Owner authorized local P1 implementation: edit detection, deterministic revalidation, source-to-claim inspection, safe invalidation, browser-local persistence, tests, browser proof, and durable media evidence.
- **Expected:** Any relevant workbook edit immediately removes current verification, then fresh integer-cent validation either publishes updated claims with source IDs or leaves them invalid. Save/reload must independently revalidate the saved workbook.
- **Status:** In progress. Existing P0 browser integration and 10 passing finance tests are the baseline; this extracted folder still has no Git repository.
- **Evidence plan:** Use public Univer 1.3.1 Facade events/ranges, test valid and invalid edits plus structural row operations, capture sanitized local screenshots, and record exact commands/results. No Pro license or Ant Ling runtime call.

### I-006 | 2026-11-03 | Workbook columns mapped in the wrong order during P1 parsing
- **Source/trigger:** First P1 regression run: five new verification tests failed with `Invalid ISO date at CSV row 2`.
- **Reproduction/root cause:** The workbook stores Date in A and Transaction ID in B, while the shared CSV validator expects ID then Date. The new grid adapter forwarded A/B unchanged.
- **Expected/fix:** Reorder the adapter's fields into the validator's declared CSV order, preserving sheet row provenance. Re-run tests and browser flow; verification pending.

### I-007 | 2026-11-03 | Workbook errors cited CSV row rather than sheet row
- **Source/trigger:** Live P1 duplicate-ID edit to B12 showed `Duplicate transaction ID T-001 at row 3` while the source cell was on sheet row 12.
- **Fix:** Remap shared CSV validator row references to actual workbook source rows in the grid adapter. Keep shared CSV errors unchanged for file imports.
- **Evidence:** New regression checks for duplicate ID and invalid money on sheet row 12; 17/17 tests pass. Final browser duplicate-ID and 640.001 amount errors both cite sheet row 12; `docs/evidence/p1-invalid-duplicate-id.jpg`.
- **Result:** Resolved locally. The workbook can show the user the actual row to repair.

### D-003 | 2026-11-03 | Certify claims from literal source cells
- **Context:** Univer formulas visibly recalculate in the editable sheet, but Proofline needs independent financial validation and clear status after edits.
- **Decision:** Subscribe to documented public Univer 1.3.1 Facade events; read source values and formulas through public range APIs; reject formulas in budget and transaction source cells; reuse the deterministic integer-cent CSV validator and analyzer. Immediately move current claims to stale and withhold current totals until validation succeeds. Preserve last verified values only as explicitly labeled previous values.
- **Limits:** P1 supports the fixed Proofline source layout, at most 500 budget and 500 transaction rows, and a 1200-row local scan limit. Browser-local snapshots are not server audit storage.
- **Evidence:** `lib/verification.ts`, `components/UniverPanel.tsx`, `tests/verification.test.mjs`, live browser observations.
- **Result:** Implemented and verified locally.

### M-005 | 2026-11-03 | P1 foundation verified locally
- **Source/trigger:** Owner's explicit P1 implementation request. Resolves I-006 and I-007. No repository, commit, remote, push, or deployment was created.
- **Features:** Public Univer edit and structural-event subscriptions; source-cell/formula reads; integer-cent revalidation; stable transaction ID to source-row mapping; claim inspection with method, sources, previous/current values and status; stale/invalid withholding; browser-local snapshot save/reload with revalidation. Category removal preserves the prior claim with an updated zero value. Invalid money, duplicate IDs, source formulas and missing headers do not certify current totals.
- **Commands:** `npm test` 17/17 passed; `npm run typecheck` passed; `npm run build` passed on Next.js 15.5.28. Final local production browser served the P1 page at `http://localhost:3000`; browser error log was empty. No lint script is defined.
- **Browser path:** Restored the P0 sample workbook in real Univer Sheets. E11 250.00→300.00 changed actual total 2135.00→2185.00 and Operations 890.00→940.00. Inspector displayed previous 2135.00, updated 2185.00, T-001 at sheet row 11, and all other contributing IDs. Editing B12 to duplicate T-001 withheld totals and marked claims invalid; repairing restored verification. Entering E12 as 640.001 likewise withheld totals; repairing restored verification. Logistics variance inspection showed the 700.00 budget at sheet row 5 and T-003/T-004 at rows 13/14. Save/reload first showed revalidation with current totals withheld, then verified persisted 2185.00.
- **Durable screenshots:** `docs/evidence/p1-verified-after-reload.jpg`, `docs/evidence/p1-invalid-duplicate-id.jpg`, `docs/evidence/p1-logistics-variance-sources.jpg` captured from the live local browser. They contain synthetic sample data only.
- **Security/attribution:** OSS Univer 1.3.1 supplied the actual editor and public APIs; Proofline code supplied independent validation and provenance. Ant Ling remains user-reported Codex development assistance only; no runtime API integration or credentials were added. `.env.local` and license keys were not used. GitHub secret review remains unavailable because this extracted workspace has no Git remote.
- **Remaining limits:** Fixed source schema and local row caps; no server persistence, authentication, multi-user audit history, broad XLSX import, signed client scope, licensed Pro feature, Ant Ling backend, or deployment. Browser-local data can be lost when site storage is cleared.
- **Next:** Define P2 server storage/audit model and client data boundaries, then extend provenance across reports after separate approval. Publishing and pushing remain unapproved.
- **Public post opportunity:** The three saved screenshots and exact test results support a factual edit→claim verification story. Do not claim Ant Ling runtime use or public launch.

### M-006 | 2026-11-03 | Browser source-record removal check
- **Action:** Selected `A16:E16` in the live Univer workbook and cleared the T-006 record. This is a record clear, not a physical sheet-row deletion. The `SheetValueChanged` path recalculated current actual spend 2185.00→2105.00 and transaction count 6→5; Outreach actual changed from 80.00 to 0.00 and its inspector showed no contributing records.
- **Evidence:** `docs/evidence/p1-record-cleared.jpg`. Reloaded the previously saved workbook and observed six transactions and verified 2185.00 restored. Physical row deletion is covered by the grid-adapter unit test; a live physical-row-delete interaction was not completed in this browser run.
- **Result:** Verified record clearing and reload recovery in the actual editor. Structural row-command handling remains an integration test target for P2 or a focused follow-up.

### M-007 | 2026-11-03 | P2 secure local storage and audit foundation requested
- **Source/trigger:** Owner authorized local P2 implementation: baseline Git safety, physical worksheet operations, authenticated versioned server storage, ownership, optimistic concurrency, migration, append-only audit, automated/browser evidence, and documentation. No push, deployment, paid infrastructure, or client-scope expansion authorized.
- **Baseline:** P1 `npm test` 17/17, `npm run typecheck`, and `npm run build` passed; live browser restored 2185.00 verified spend in real Univer. No configured license or Ant Ling runtime key was found in the frontend or local template. Initialized local Git after staged-file secret/path review; committed verified P1 as `6a3f38f` on `main`, then created `p2/server-storage-audit`.
- **Expected:** Preserve P1 behavior, add local authenticated revision storage with immutable history and explicit migration, verify isolation and conflict handling, and document unsupported editor operations honestly.
- **Status:** In progress. This is a local development milestone only.

### D-004 | 2026-11-03 | Use private local SQLite storage for P2
- **Question:** How can P2 verify authenticated server persistence without hosted credentials, paid infrastructure, or deployment?
- **Decision:** Use Node 24's built-in `node:sqlite` as a local PostgreSQL equivalent for this milestone. Store the database under ignored `.proofline-data/`, bind Next.js to `127.0.0.1`, and retain the P1 localStorage copy until an explicit import. The database records schema version 2; each workbook snapshot records schema version 1 and an immutable revision number.
- **Reason:** One local transactional database supports atomic snapshots, owner checks, idempotent writes, revision conflicts, normalized source/claim rows, and audit entries with no additional service or paid cost. This does not establish production hosting or backup guarantees.
- **Evidence:** `lib/server/store.ts`, `lib/server/auth.ts`, `lib/server/snapshot.ts`, API routes, Node SQLite documentation, P2 tests, and local browser flows.
- **Result:** Implemented locally. PostgreSQL migration and production operations remain future work.

### I-008 | 2026-11-03 | Raw Univer snapshot uses date serials
- **Reproduction:** The first explicit P1 browser-local import produced private revision 1 with `Date must be text on sheet row 11`. The source displayed `2026-10-01` in Univer, while its saved snapshot contained serial `46296` and an ISO date number format.
- **Root cause:** Browser Facade range values were formatted strings; raw `FWorkbook.save()` cells used Excel date serials. The first server parser assumed a text date.
- **Fix:** Convert an integer serial only when the cell has the exact supported `yyyy-mm-dd` style and a supported 1900/1904 date system. Keep any other numeric date invalid. The invalid first revision remains in the audit history; the retry created a separate verified private import.
- **Evidence:** `tests/server.test.mjs` date-serial regression; live import revised from invalid to verified 2185.00; `docs/evidence/p2-private-revision-audit.jpg`.
- **Learning:** Independent server certification must inspect saved raw SDK data, not assume the Facade's display value shape.

### I-009 | 2026-11-03 | P2 test harness exposed Node TypeScript and scrypt limits
- **Failures:** First Node strip-types test rejected a TypeScript constructor parameter property; after replacing it with an explicit field, password-hash test failed because the requested scrypt cost exceeded Node's default memory allowance.
- **Fix:** Use a normal constructor field and an explicit 64 MB `maxmem` for `N=32768,r=8,p=1` scrypt. Store only salted password hashes and hashed session tokens.
- **Evidence:** Final password/session test passes within the 25-test suite; typecheck and build pass.
- **Learning:** Node's test-time TS stripping and crypto defaults need their own runtime check even when TypeScript typechecking passes.

### M-008 | 2026-11-04 | P2 authenticated revision and audit path verified locally
- **Implementation:** Added local accounts with scrypt password hashing, bounded login attempts, random HttpOnly SameSite session cookies, same-origin write guard, owner-scoped workbook and audit APIs, 2 MB snapshot limit, independent server revalidation, immutable revision snapshots, normalized transaction/budget/claim rows, optimistic `expectedRevision`, retry-safe idempotency keys, and append-only audit triggers with actor, timestamp, action, before/after state, record IDs and claim impact. Existing browser-local P1 snapshots require an explicit import; the import never deletes local data. No Univer Pro or Ant Ling application runtime package was added.
- **Automated checks:** `npm test` 25/25 passed, including ownership, conflicts, idempotency, migration, malformed snapshots, throttling, audit and structural-command restrictions. `npm run typecheck` and `npm run build` passed on Next.js 15.5.28. The production server returned HTTP 200 bound to `127.0.0.1:3000`.
- **Browser path:** Created synthetic local accounts. First account imported verified 2185.00 source data after the date-serial correction. Edited E11 from 300 to 310 in real Univer; current claims went stale, then verified 2195.00; private revision 2 saved and reloaded with T-001 at 310. Audit showed `local_import` and `workbook_saved` with verification impact. A second account listed no first-account workbooks, and direct navigation to the first user's workbook API returned `Workbook not found`. Signing into the second account after a reload showed a blank editor and no private claims; signing back into the first required an explicit workbook open. An older invalid import stayed invalid when opened.
- **Evidence:** `docs/evidence/p2-private-revision-audit.jpg`, `docs/evidence/p2-access-denied.jpg`; browser console review and final secret scan are recorded separately below.
- **Result:** Verified local server persistence and ownership; no hosted service, push, or deployment.

### I-010 | 2026-11-04 | Physical worksheet edits need conservative certification
- **Reproduction:** In the real Univer browser editor, deleting source sheet row 11 shifted T-002 into row 11. A physical row insertion also executed. A row-header drag selected rows 11–14 but did not move them; actual rearrangement by drag remains unverified. Source-cell paste had previously changed E11 from 300 to 305, triggering stale and then verified 2190.00.
- **Risk:** Row insert/delete/move/reorder/sort commands can change the source layout and formula references in ways this fixed-schema verifier has not certified.
- **Fix:** Subscribe to the public Univer `CommandExecuted` event and fail closed on recognized structural command IDs. Current claims are withheld; a server save stores an invalid revision and its audit impact as `claims_withheld`. Only a fresh validated CSV import resets this restriction. On reload, any server-invalid revision remains unverified even if the client parser could read some source cells.
- **Evidence:** Browser delete immediately showed prior 2195.00 and withheld updated value; `docs/evidence/p2-row-delete-withheld.jpg`. Saved the deleted workbook as private revision 3 `invalid`; reload/open still withheld current totals. Physical insertion also caused invalid state. `tests/verification.test.mjs` covers structural IDs, row mapping and pasted duplicate IDs.
- **Result:** Delete, insert, and paste behavior checked in the actual browser. Drag-based rearrangement did not execute, so it is not claimed as supported or verified. Any recognized structural move/reorder/sort command is fail-closed; broader UI coverage remains open.
- **Learning:** An observed selection gesture is not proof of row movement. The UI must never show a prior financial total as currently verified after a structural command.

### D-005 | 2026-11-04 | Univer entitlement and attribution boundary
- **Question:** Do P2 storage or audit features depend on an unverified Univer commercial license?
- **Review:** Official Univer installation and server integration guidance distinguishes OSS editing from licensed Pro/server capabilities and leaves application authentication, data ownership and persistence to the host application. The installed runtime remains coordinated OSS 1.3.1 packages with no `@univerjs-pro/*` dependency, no license activation and no license credential in the client.
- **Decision:** Attribute editing, formulas, Facade events and snapshots to Univer; attribute independent calculations, auth, storage, provenance and audit to NEXUZ/Builder. Ant Ling remains owner-reported Codex development assistance, with no verified Proofline runtime call.
- **Sources:** https://docs.univer.ai/guides/docs/getting-started/installation ; https://docs.univer.ai/server ; https://docs.univer.ai/guides/server-integration/license
- **Result:** OSS capability reviewed. Exact partnership entitlement, future Pro rights, domains and activation remain unresolved with the client; no credential was displayed or committed.

### M-009 | 2026-11-04 | P2 final local safety review
- **Checks:** `npm test` 25/25 passed; `npm run typecheck` passed; `npm run build` passed. Local production HTTP 200 listened only on `127.0.0.1:3000`. Unauthenticated workbook listing returned HTTP 401; an auth write without same-origin headers returned HTTP 403. Browser console error list was empty after the live editor checks.
- **Secret review:** `.env.local` absent; `.proofline-data/proofline.sqlite`, build output, npm cache and logs ignored. `git diff --cached --check` passed. A source-file scan for private-key blocks, AWS/OpenAI-like tokens and long literal key/password/secret assignments returned no matches. Reviewed all three P2 screenshots visually; they show synthetic records and test account names only. The staged path list contains no private database or environment file. No remote is configured, so GitHub contents cannot be checked.
- **Result:** P2 branch ready for a local commit. No push, public deployment or publication authorized.

### M-010 | 2026-11-04 | GitHub and Vercel publication requested
- **Source/trigger:** Owner explicitly requested a GitHub push and Vercel deployment, with a short Vercel link.
- **Expected:** Publish the reviewed P2 code to an authorized GitHub repository and deploy a working app under the shortest available Vercel project domain, after resolving the local SQLite durability limit and verifying the live build.
- **Baseline:** Local P1 commit `6a3f38f`, P2 commit `e105ce3`, clean `p2/server-storage-audit` branch, and no Git remote. The current SQLite file is ignored and local only.
- **Status:** In progress. Connected GitHub and Vercel plugin calls were unavailable to the model; checking authenticated local tooling and existing account/project state. No push or deployment has occurred in this entry.

### D-006 | 2026-11-04 | Hosted storage uses PostgreSQL
- **Question:** Can Vercel run P2's local SQLite file as durable, private workbook storage?
- **Decision:** No. Add an async PostgreSQL adapter for hosted runs while preserving the SQLite adapter for local use. Both call the same independent snapshot validator and enforce ownership, revision conflicts, retry keys, normalized source/claim history and append-only audit. Vercel fails closed if no `DATABASE_URL` or `POSTGRES_URL` is configured.
- **Infrastructure:** Created a new `proofline` Vercel project and a dedicated `proofline-db` Neon resource on the explicit `free_v3` plan, separate from the account's unrelated database. Credentials were injected by Vercel; the temporary ignored `.env.local` used for a live integration check was removed afterward. No paid plan or custom domain was purchased.
- **Evidence:** Official Vercel Marketplace/Postgres guidance, `lib/server/postgres-store.ts`, live Neon integration check, 25 local tests, typecheck and build.
- **Result:** Hosted adapter verified against a real PostgreSQL service; deployment and live site checks remain pending.

### I-011 | 2026-11-04 | PostgreSQL fixture row assumption and certificate setup
- **Failure:** First live PostgreSQL test created a synthetic account and revision, then attempted to edit fixed row 11 in a smaller one-budget fixture. That row did not exist, so the test failed with a local `TypeError`; the created synthetic revision remains in the dedicated test database.
- **Fix:** Find the transaction by immutable `IT-001` ID before editing its amount. Re-run against a new synthetic account; verified revision 1→2, owner isolation, stale revision conflict, idempotency, before/after audit and the append-only trigger.
- **Security check:** The computer's inherited `NODE_TLS_REJECT_UNAUTHORIZED=0` disabled certificate checks for the first package install. Subsequent Vercel and PostgreSQL operations explicitly set `NODE_TLS_REJECT_UNAUTHORIZED=1` with Node `--use-system-ca`. The PostgreSQL URL is normalized to `sslmode=verify-full`. Reinstall dependencies under certificate validation before publishing.
- **Evidence:** `tests/postgres.integration.mjs`; successful live check output contains no connection string or password. No customer data was used.
- **Result:** Test fixture issue resolved. Certificate-validated `npm ci` installed 157 packages; final 25-test suite, typecheck and production build passed.

### I-012 | 2026-11-04 | Hosted account copy implied cross-origin P1 migration
- **Reproduction:** The live Vercel page showed “Local development account” and implied a localhost P1 browser copy would be available at the hosted origin.
- **Root cause:** P2 copy was written for loopback-only storage before the authenticated PostgreSQL deployment. Browser localStorage is scoped to its origin.
- **Decision/fix:** Use hosting-neutral account copy. State that the import reads only this site's browser-local copy and that localhost data requires the original CSVs to be uploaded at the hosted site. Keep the legacy copy untouched.
- **Status:** Copy corrected in `components/AccountPanel.tsx`, README and project context. Final local tests, typecheck and build passed. Redeployed page rendered “Private account” and scoped browser-local copies to “this site”; HTTP 200 response contained the new text. No cross-origin migration is claimed.

### M-011 | 2026-11-04 | Private GitHub push and hosted P2 verification
- **Source/authorization:** Owner requested GitHub push and Vercel deployment with a short link after the P2 foundation. No paid service or public repository was requested.
- **Git:** Reviewed staged paths and secrets, committed PostgreSQL adapter as `7f2a8d9`, created private `https://github.com/0xNexuz/proofline`, and pushed `p2/server-storage-audit` as its default branch. P1 baseline `6a3f38f` is in branch history. No customer data, live environment file, local database or commercial license was pushed.
- **Hosting:** Vercel `xreyys-projects/proofline` deployed Next.js 15.5.28 successfully with a dedicated free Neon PostgreSQL resource. The shortest requested `proofline.vercel.app` alias was already in use; Vercel assigned `https://proofline-alpha.vercel.app/`. No custom domain or paid plan was purchased.
- **Browser path:** Hosted page returned HTTP 200 and displayed the real Univer toolbar, grid and formulas. Created a synthetic account, loaded six sample transactions, verified budget 3000.00 and actual 2135.00, saved private revision 1. Editing E11 from 250 to 305 revalidated actual to 2190.00, Operations to 945.00 and the T-001 source record to 305.00; saved revision 2. A full page reload retained the authenticated account; opening the stored workbook restored the 2190.00 result and T-001 value. Audit displayed `workbook_created`/`claims_verified` and `workbook_saved`/`claims_recalculated`.
- **Evidence:** `docs/evidence/p2-vercel-live.png` contains synthetic data only. Live Neon integration test separately passed owner isolation, historical revisions, conflict, idempotency and append-only audit checks. Final local `npm test` 25/25, `npm run typecheck` and `npm run build` passed. The first final secret-scan shell command had a PowerShell quote parser error; the corrected scan found no key patterns and only the expected blank `.env.example` among tracked env paths.
- **Limitations:** Hosted backup/restore, multi-host sessions, external security assessment and client license entitlements are unverified. Localhost SQLite and browser localStorage are not automatically migrated to the hosted origin. Actual drag row rearrangement is unverified and structural commands withhold claims.
- **Follow-up:** Corrected the hosted account copy (I-012), committed evidence/docs as `fc9f253`, redeployed and verified the same short alias serves the update.

### M-012 | 2026-11-04 | Final hosted alias and data continuity
- **Deployment:** Vercel production deployment `dpl_6hXUbKqzpLTU41QsUqVy8srJF1J4` reached Ready and aliases to `https://proofline-alpha.vercel.app/`. The deployment includes commit `fc9f253`, which was pushed to the private GitHub default branch. `proofline.vercel.app` could not be used because Vercel reported it already assigned.
- **Post-deploy checks:** HTTPS root returned 200 and served corrected account copy; `/api/auth` returned 200 for an anonymous session; `/api/workbooks` returned 401 without authentication. A synthetic existing account logged in successfully after the redeploy, listed one verified workbook at revision 2, retrieved independently certified `actualTotalCents=219000`, and reached its audit endpoint with HTTP 200. No real financial or client data was used.
- **Browser tool limitation:** The final redeploy browser reload displayed the corrected account copy, then the browser automation connection timed out before a further full inspection. The complete real-browser edit/save/reload/audit path passed on the immediately preceding deployment, whose application logic is unchanged by the text-only correction. The final HTTP and authenticated API checks passed.
- **Result:** Owner-authorized private GitHub push and free Vercel deployment complete. Remaining open items are tested backup/restore, production security review, cross-origin migration, actual row rearrangement support and licensed Pro/client-scope decisions.

### Q-002 | 2026-11-04 | Ant Ling usage wording on public pages
- **Asked/stated:** Owner said the Ant Ling API has not been used yet (Univer license also unused; open-source Univer SDK in use).
- **Decision:** Public pages stop saying "Ant Ling assists development in Codex". They describe Ant Ling only as in-development report drafting, which is true either way. D-001 is left unchanged as history; owner to confirm whether Codex ever ran on Ant Ling.
- **Status:** Copy change made in M-013.

### M-013 | 2026-11-04 | Build-story landing page with merged artwork
- **Source/trigger:** Owner asked for an original artwork for the ProofLine UI that merges three visual references (a clay 3D spreadsheet card, a blue editorial ring composition, a four-part puzzle disc), rewritten about the build, with smooth and hover animations. Owner confirmed the references are not theirs to reuse, so the artwork is drawn in code with no copied imagery, people or third-party branding. Owner chose: landing page at `/`, workspace moved to `/app`.
- **Expected:** `/` shows the artwork hero, how-it-works, build facts and build log; `/app` serves the unchanged workspace; reduced motion respected; mobile layout without horizontal scroll; all existing checks still pass.
- **Status:** In progress on branch `landing/build-artwork`.
- **Implementation:** `/` is a new build-story landing page (`components/landing/`, `app/landing.css`); the unchanged workspace moved to `/app` (`app/app/page.tsx`), and its wordmark links home. The hero artwork is drawn in SVG/CSS: blue field with line geometry and a segmented ring, a paper plate holding a four-part wheel (Univer Sheets, cent engine, your approval, Ant Ling), a clay spreadsheet card, paper documents and a dark caption card. Fonts are self-hosted with `@fontsource-variable/newsreader` and `@fontsource-variable/inter-tight` (5.3.0).
- **Motion:** One load sequence (lines and ring draw, plate and pieces pop, card drops in, caption rises). Hover/focus/tap on a wheel piece lifts it and swaps the caption to that part and its status; the clay card tilts with the pointer and runs a re-check sweep; documents lift; a trace bar types example lookups from the synthetic demo data (Logistics 890.00 = T-003 + T-004; total 2,135.00 = 6 rows; Outreach has no budget line). `prefers-reduced-motion` disables all of it.
- **Honesty checks:** Ant Ling is shown as "Next"/"In progress" everywhere; the workspace footer no longer mentions Codex (Q-002). Facts on the page (Univer 1.3.1 OSS, 25 tests, integer cents, private versions with append-only audit) match earlier ledger evidence.
- **Checks:** `npm test` 25/25 passed; `npm run typecheck` passed; `next build` passed with `/` and `/app` static. Playwright (Chromium) on the production server: no console errors on `/` or `/app`; no horizontal overflow at 1440px or 390px; wheel hover swapped the caption (Cent engine/Live, Ant Ling/Next); keyboard Tab reached the wheel pieces; `/app` still loaded the synthetic demo to "Verified" with 6 records; reduced-motion render checked.
- **Bugs found and fixed during the build:** (1) A `.lp a { color: inherit }` reset outranked the white button colour, hiding button text; scoped the reset with `:where()`. (2) The same reset specificity cancelled section margins (build-log track touched its heading). (3) Entrance animations with `fill-mode: both` held their final transform and blocked hover lifts; switched to `backwards`. (4) Puzzle tabs kept full colour while their pieces desaturated on hover; tabs now share the filter.
- **Evidence:** `docs/evidence/m013-landing-hero.jpg`, `docs/evidence/m013-wheel-hover.jpg`.
- **Status:** Verified locally on branch `landing/build-artwork`; PR opened for owner review. Not merged or deployed to production.

### M-014 | 2026-11-04 | Univer licensed features: Budget vs actual chart
- **Source/trigger:** Owner received Univer's `license` (license.txt) and `licenseKey` (licenseKey.txt) and asked to integrate the SDK license. Neither file's contents were shared in chat, committed or logged.
- **Implementation:** Added `@univerjs/preset-sheets-drawing` and `@univerjs/preset-sheets-advanced` pinned at 1.3.1 (all 76 resolved `@univerjs/*` and `@univerjs-pro/*` packages at 1.3.1; icons stays 1.46.0). `lib/univer-pro.ts` builds the presets (core, drawing, advanced with `license`) and inserts a column chart over the category block (`A3:C{3+n}`, categories vs Budget and Actual (formula), title "Budget vs actual", position G3). `components/UniverPanel.tsx` loads that module with a dynamic import only when `NEXT_PUBLIC_UNIVER_LICENSE` is set (or the local-only `NEXT_PUBLIC_UNIVER_PRO_PREVIEW=1`), so the default bundle and behaviour are unchanged. If the licensed module fails to load, the editor falls back to open-source Sheets.
- **License boundary:** Univer's Web SDK takes the license.txt contents in the browser (official license guide). licenseKey.txt is only for a Univer server (collaboration, exchange) and is not used. XLSX import/export menus in the advanced preset need a `universerEndpoint`, which is not configured.
- **Checks:** `npm test` 25/25; `npm run typecheck`; `next build` (`/app` first-load JS unchanged at 114 kB; licensed code is a lazy chunk). Browser, preview mode (no license, Univer watermark shown as expected): chart rendered from workbook cells; claims stayed Verified after chart insertion (chart commands are not structural row/column commands); edited E11 250→300, chart and Operations actual updated to 940, verified actual 2185.00; saved private revision 1 (server status verified); page reload, opened revision restored the chart and the edit, claims Verified 2185.00; no console errors. Browser, default build without license: no licensed chunk requested, demo verified, landing unaffected.
- **Evidence:** `docs/evidence/m014-chart-reopened-unlicensed-preview.jpg` (watermark visible because no license was used locally).
- **Open:** Licensed render (watermark removed) must be confirmed on the hosted domain after the owner adds `NEXT_PUBLIC_UNIVER_LICENSE` in Vercel and redeploys; whether the license is domain-bound is unknown.
- **Status:** Verified locally on branch `univer-pro/charts`; PR for owner review.

### I-013 | 2026-11-04 | Dev server rejects writes from 127.0.0.1
- **Reproduction:** `next dev -H 127.0.0.1`, browse to `http://127.0.0.1:3001/app`, create an account: HTTP 403 "Same-origin request header required". The same request from `http://localhost:3001` succeeds.
- **Cause:** In dev, `request.nextUrl.origin` reports `localhost` while the browser sends `Origin: http://127.0.0.1:…`, so `sameOriginWrite` fails. Production (`next start`) checks earlier passed.
- **Status:** Not changed (security guard behaves correctly for production). Use `http://localhost:<port>` for local dev testing.


### M-015 | 2026-11-04 | Ant Ling runtime: grounded report drafts
- **Source/trigger:** Owner asked to use the Ant Ling API key in Proofline (first message of this session; PRs #1 and #2 merged, owner asked what is next). This is the first Ant Ling **runtime** integration; until a live call succeeds it is not claimed as working.
- **Expected:** A server-only route drafts a short summary of a saved, verified workbook revision. Ant Ling writes wording only; every figure and transaction ID is inserted by Proofline from its integer-cent engine via fact tokens. Drafts that contain any other number are rejected. Without `ANT_LING_API_KEY` the feature reports "not configured" and the rest of the app is unchanged.
- **Status:** In progress on branch `ant-ling/report-drafts`. Owner has not created the Ant Ling token yet, so live verification is pending.
- **Implementation:** `lib/server/ant-ling.ts`: OpenAI-compatible client for `POST {base}/chat/completions` (Bearer key from `ANT_LING_API_KEY`; default base `https://api.ant-ling.com/v1`, model `Ling-3.1-flash`; `thinking: {type: disabled}` sent only to Ant Ling's host; 45 s timeout; 401/402/429/5xx mapped to clear errors with the key redacted). `lib/server/report-draft.ts`: fact sheet built from the engine (totals, counts, per-category budget/actual/variance, transaction IDs, each mapped to a claim), prompt that forbids numbers, validator (unknown tokens, digits, %/currency symbols, spelled-out numbers, markdown, length) and renderer that inserts engine values; one retry naming the broken rule, then a 422. Routes: `GET /api/ai/status` (configured flag and model only) and `POST /api/workbooks/[id]/report` (same-origin guard, sign-in, owner-scoped load, independent `inspectSnapshot` re-verification, refuses unverified revisions with 409, per-user throttle, `maxDuration` 60). UI: `components/ReportDraft.tsx` under Claim inspection; each inserted figure is a button that opens its claim; copy-text; outdated-revision warning.
- **Data sent to Ant Ling:** workbook title (braces stripped), verified totals, category names and statuses, transaction IDs. Not sent: CSV files, descriptions, dates, account details.
- **Checks:** `npm test` 35/35 (10 new: fact values from the engine, prompt rules, rendering and claim links, rejection of model-written numbers/percent/spelled numbers/unknown or malformed tokens/markdown, digit-containing category names, retry then success, give-up after two rejections, config defaults and https rule, request shape and headers, error mapping with key redaction, timeout). `npm run typecheck`; `next build` (new routes `/api/ai/status`, `/api/workbooks/[id]/report`). Production server without a key: status `configured:false`, unauthenticated draft 401, missing same-origin header 403, `/` and `/app` 200.
- **End-to-end (stand-in server, not Ant Ling):** a local OpenAI-compatible stand-in on `http://127.0.0.1:4010/v1` (http allowed only for localhost) returned a rule-breaking first draft ("2185.00" written directly), then a token draft. In the real browser: account created, demo saved as verified revision 1, Draft summary returned three paragraphs with 9 engine-inserted figures and the "first draft rejected" note; clicking 890.00 opened the Logistics actual claim (890.00); an immediate second request showed "Please wait a few seconds before drafting again"; no console errors. Evidence: `docs/evidence/m015-draft-card-standin-server.jpg`. **This proves Proofline's grounding and UI path, not Ant Ling's output.**
- **Open:** live call with the owner's token (record model, request ID, token usage, and whether Ling follows the token rules; tune the prompt if the rejection rate is high); audit-trail entry for drafts; Univer Docs editor for the approved summary (P3).
- **Status:** PR for owner review. Ant Ling runtime remains **unverified** until a live call succeeds.


### M-016 | 2026-11-04 | Workspace redesign (/app)
- **Source/trigger:** Owner saw the live `/app` and asked why the workspace still had the old layout. Only the landing page had been redesigned (M-013); the workspace kept the original stacked dark cards with the Univer editor at the bottom.
- **Expected:** The Univer workbook becomes the main surface; verified totals, claim inspection and the Ant Ling summary sit in a side rail; import and account move into a dialog and a slide-over; visual language matches the landing page; the workbook itself gets readable formatting; no change to verification, storage or drafting logic.
- **Deployment note (owner action, recorded):** The owner imported the repo as a new Vercel project `proofline-2obq` (Git-connected) instead of linking the original `proofline` project; `proofline-alpha.vercel.app` was moved to it and the Neon store was connected after its last build, so a redeploy is required before hosted sign-in and saving work.
- **Status:** In progress on branch `workspace/redesign`.
- **Implementation:** New shell in `components/Workspace.tsx`: dark top bar (wordmark linking home, workbook title and revision, live status pill, Import CSVs, Load sample, account button); main grid with the Univer workbook on the left and a sticky rail on the right. `components/TotalsPanel.tsx` (new): verified totals plus a budget bar per category; clicking a category opens its claim. Import moved to a dialog, account to a slide-over (`components/AccountPanel.tsx` copy rewritten without internal phase jargon; history labels humanised). `components/UniverPanel.tsx`: sheet bar with Univer and licence chips, Save on this device / Save revision, status line, an empty-state card over the grid, a loading placeholder while the editor chunk downloads, and workbook formatting (bold header rows with a tint, column widths). Licensed chart moved to F3 at 310x250 so it fits beside the tables. Styles: `app/app/workspace.css` (scoped `.ws`); the old global dark styles (`app/p1.css`, `app/p2.css`, most of `app/globals.css`) were removed.
- **Checks:** `npm test` 35/35; typecheck; `next build` (`/app` 11.3 kB). Real browser on dev with licensed preview and the local Ant Ling stand-in: empty state, load sample to Verified, category click opens Logistics actual, sign-up in the slide-over closes it, Save revision makes revision 1 Verified, Draft summary renders, Import dialog closes with Escape, phone 390px has no horizontal overflow, no console errors. Production build without licence: landing unchanged, `/app` loads sample to Verified with only the Univer Sheets chip, no console errors.
- **Evidence:** `docs/evidence/m016-workspace-oss.jpg`; `docs/evidence/m016-workspace-licensed-preview-standin-draft.jpg` (watermark because no licence locally; the draft came from the stand-in server, not Ant Ling).

### I-014 | 2026-11-04 | Number formats change what the verifier reads
- **Reproduction:** Applying `setNumberFormat('#,##0.00')` to budget and amount cells after import; the client verifier then received `"1,500.00"` from `FRange.getValues()` and withheld all totals ("Invalid money value on sheet row 4").
- **Root cause:** In Univer 1.3.1, `getValues()` returns display text for number-formatted cells; Proofline's client verifier deliberately accepts only numeric amounts.
- **Fix:** Do not apply number formats. Formatting is limited to bold headers, header tint and column widths, none of which change values. Recorded in code next to `styleWorkbook`.
- **Status:** Fixed and re-verified in the browser (Verified, 6 records). A user who applies a number format by hand will see totals withheld; that is the intended fail-closed behaviour until the verifier reads raw cell values.

### I-015 | 2026-11-04 | Workspace button styles leaked into Univer; overlay under the canvas
- **Reproduction:** First redesign pass styled every `button` under `.ws`, which boxed Univer's own toolbar tabs and icons; the empty-state overlay sat under Univer's canvas and could not be clicked.
- **Fix:** All generic element rules exclude `.editor-host *`; the editor host gets `isolation: isolate` so Univer's internal z-indexes stay inside it.
- **Status:** Fixed; screenshots show Univer's native toolbar and a clickable empty state.


### M-017 | 2026-11-04 | Live checks: Univer license and first Ant Ling call
- **Deployment:** Vercel project `proofline-2obq` (Git-connected) deployed the PR #4 merge `df48161` to production; `proofline-alpha.vercel.app` serves it. The Neon store was connected before this build. `GET /api/ai/status` on the live domain returned `configured: true`, model `Ling-3.1-flash`; no runtime errors in the Vercel error view.
- **Univer license (owner-observed):** With `NEXT_PUBLIC_UNIVER_LICENSE` (license.txt, Vercel "Config" visibility, Production) the live `/app` showed no "Univer Office" watermark, so the license is accepted on `proofline-alpha.vercel.app`. `licenseKey.txt` remains unused.
- **Ant Ling runtime (owner-observed):** On the live site the owner created an account, saved revision 1 and pressed Draft summary. Ant Ling returned a draft in which every figure was rendered as an engine-inserted fact (total budget 3000.00, actual 2035.00, variance -965.00, 4 categories, 6 transactions, 2 flagged, Operations 1500.00/890.00/-610.00, ...). The saved revision's actual total (2035.00) differs from the sample's 2135.00, consistent with an amount edited before saving; owner asked to confirm.
- **Not captured:** request ID, model version string and token usage for this call. The API returns them in the draft response, but the UI does not display them and Hobby runtime logs keep no request records for this route. Capture them from the browser network panel for formal evidence.
- **Follow-up in this entry:** Landing now lists Ant Ling as Live, the build log adds "Ant Ling writes the summary" (shipped) and "Reports in Univer Docs" (next), facts show 35 tests and the licensed SDK; AGENTS.md rule 6 updated to describe the runtime role.

### Q-003 | 2026-11-04 | Landing page cleaned for submission
- **Asked:** Owner is submitting the project and asked to remove the build log and anything not needed from the landing page.
- **Decision/changes:** Removed the Build log section, its nav link and step data; removed "We're building ProofLine in the open" from the hero; removed Live/In progress status tags from the parts list and the wheel caption (all parts are live); the caption chip reads "How it works"; the closing section keeps only the "Open the workspace" call to action. The engineering build log stays in `docs/BUILD_LEDGER.md`.

### M-018 | 2026-11-05 | Univer Docs report with figure check and approval
- **Source/trigger:** Owner made the repo public and asked to finish the remaining gaps against the Proofline proposal. The largest gap: a report document (Univer Docs), approval before sharing, and flagging conclusions affected by later data changes.
- **Expected:** The Ant Ling draft opens in an editable Univer Docs report with an evidence section. "Check figures" compares every number in the edited text with the cent engine's figures for the latest revision and lists changed, unknown or hand-typed numbers. "Approve" re-runs the check on the server, requires the latest revision, and records an append-only `report_approved` audit entry with the text hash.
- **Security note:** Before this work the full Git history was scanned for keys, licence text, database URLs and env files after the repo went public; none found.
- **Changes:**
  - `@univerjs/preset-docs-core` 1.3.1 added (same release as the other Univer packages). `lib/univer-docs.ts` mounts a Univer document with the Facade API (`createDocument`, `appendParagraph`, `setStyle` with named heading styles, `getParagraphs().getText()`), loaded only when the report opens.
  - `components/ReportEditor.tsx`: "Open as report" on the draft card opens the report in Univer Docs with a Summary and an Evidence section (each cited figure with its source transaction IDs). Side panel: Check figures, Approve report, Copy report text.
  - `lib/server/report-check.ts`: every number in the edited text must be a current engine figure, a transaction date, a month/quarter-year or part of the workbook title. Figures from an older revision are reported as changed (was → now); hand-typed numbers are reported with their surrounding words.
  - Routes `POST /api/workbooks/[id]/report/check` and `/report/approve` (same-origin, signed-in owner, latest verified revision). Approval re-runs the check on the server, refuses an outdated revision (409) or any mismatch (422), and appends a `report_approved` audit entry (`figures_verified`) with the verified count, SHA-256 of the text and the text. SQLite and PostgreSQL stores both implement `recordReportApproval`.
  - Draft response now includes `evidence`; account history labels approvals ("Report approved, every figure matched").
- **Tests:** `npm test` 43/43 (8 new in `tests/report-check.test.mjs`: matching report passes; typed and percent numbers flagged; later revision reports 2135.00→2185.00 and 890.00→940.00 without double-reporting; removed/unknown/empty cases; short figures cannot hide digits inside 2026 or 1600.00; dates allowed; evidence sources; body validation; approval audit, outdated-revision conflict, other user gets not found). `npm run typecheck` passed. `npm run build` passed.
- **Browser (production build, local, stand-in Ant Ling server on 127.0.0.1):** sign up → load sample → save revision 1 → draft → Open as report → Check: 12 figures match. Typed "We expect about 2500.00 next month." → flagged with context; Approve refused (422). Removed the sentence → Check passes → Approve: "Approved for revision 1", history shows "Report approved, every figure matched". Edited T-004 to 440 and saved revision 2 → reopening the old draft reports Total actual spend 2135.00→2185.00 and Logistics actual 890.00→940.00. No console errors besides the expected 422.
- **Evidence:** `docs/evidence/m018-report-approved.jpg`, `docs/evidence/m018-report-typed-number-flagged.jpg`, `docs/evidence/m018-report-later-save-changed.jpg`.
- **Not done / limits:** Live check on the deployed site after merge. The report is not saved as its own document (the approved text and hash are kept in the audit entry; Copy gives the text). No Slides output, AI categorisation or receipt/PDF upload.
- **Status:** Built and verified locally; PR pending owner review.

### M-019 | 2026-11-05 | README rewritten for reviewers
- **Source/trigger:** The repository is now public and is part of the submission; the previous README described the P2 foundation, called the repo private and predated the landing page, Ant Ling drafting, the licensed chart and the Docs report.
- **Expected:** A reviewer can understand what ProofLine does, try it on the live site in a few steps, see exactly how Univer and Ant Ling are used, run it locally, and read the honest limits.
- **Changes:** `README.md` rewritten: live link and a six-step walkthrough, data flow, Univer packages and Facade APIs actually used, Ant Ling's role and the number rule, local run and environment variables, limits (CSV only, no AI categorisation, no Slides, report kept in the audit trail, no hosted backup/restore or external security review), and a guide to the repo and its evidence logs.
- **Verification:** Every API, label and command named in the README was checked against the code on this branch (`createWorkbook`, `inspectSnapshot` on save, `engines.node` 24.x, UI labels Load sample / Save revision / Draft summary / Open as report / Check figures / Approve report).
- **Status:** In PR #6 with M-018.

### M-020 | 2026-11-05 | Ant Ling category suggestions with user confirmation
- **Source/trigger:** Owner asked to build the next proposal gap now. The proposal promises: "Review AI-suggested categorizations and confirm uncertain matches."
- **Expected:**
  - A transactions CSV may leave the category blank. Import then opens a review step instead of failing.
  - Ant Ling suggests a budget category for each blank row, with a confidence and a short reason. It receives only the IDs, descriptions and labels of the rows under review, plus the budget category names.
  - Confident suggestions for blank rows are filled in; uncertain ones must be confirmed. Ant Ling can never change a category the file already states without the user's click.
  - The suggestions are validated on the server: only real budget category names, known IDs and short reasons.
  - After the first save, the confirmed decisions are checked against the saved revision and appended to the audit trail.
- **Changes:**
  - `lib/finance.ts`: `parseTransactions(text, { allowBlankCategory })` for the review step only (strict by default, formula-looking text still refused), plus `categoryGaps`.
  - `lib/server/categorize.ts`:
    - validates the request (1–30 unique categories, 1–40 rows, length limits)
    - sends the IDs, descriptions and labels as JSON data, telling the model to ignore instructions inside descriptions
    - accepts only budget names or none, and only the IDs asked about; reasons are cut to 140 characters
    - marks any change to an existing label as "low"; retries once on a malformed reply
  - `POST /api/ai/categorize`: same-origin, signed in, throttled per user; returns suggestions only.
  - `POST /api/workbooks/[id]/categories`: records only the decisions that the saved revision actually contains, as audit action `categories_confirmed` (`categories_reviewed`). Implemented for both SQLite and PostgreSQL.
  - `components/CategoryReview.tsx`:
    - confident suggestions for blank rows are filled in; uncertain ones need **Confirm**
    - an existing label stays unless the user clicks **Use …**
    - **Build workbook** stays disabled until every row is decided
  - The claim inspector shows how each category was chosen while the cell still matches. History shows "Categories reviewed at import".
  - New sample `data/sample-transactions-uncategorised.csv` (the same IDs and amounts as the main sample, so it reaches the same verified totals). The shared throttle moved to `lib/server/throttle.ts`. `chatCompletion` gained `maxTokens`.
- **Tests:** `npm test` 49/49 (6 new in `tests/categorize.test.mjs`); `npm run typecheck` and `npm run build` passed.
- **Browser (production build, local, stand-in Ant Ling on 127.0.0.1):**
  - Signed out, the review step works without Ant Ling, and Build stays disabled while rows are blank.
  - Signing in from the review step keeps the review open.
  - Suggest categories: T-002 Operations and T-004 Logistics are filled in as confident. T-005 Community needs Confirm. T-006 keeps "Outreach", with "Use Community" offered.
  - After Confirm and Build: Verified, total 2135.00, Logistics over by 190.00, Outreach flagged as unbudgeted.
  - The claim note reads "Category set at import from Ant Ling's suggestion (confirmed by you)". Save revision 1, then History shows "Categories reviewed at import, choices match the saved revision".
  - The stand-in logged the request: IDs, descriptions and labels only, with no amounts.
  - On a 390 px phone there was no sideways scroll. The report flow from M-018 re-ran unchanged.
- **Evidence:** `docs/evidence/m020-category-review-suggestions.jpg`, `docs/evidence/m020-claim-category-note.jpg`, `docs/evidence/m020-history-categories-reviewed.jpg`.
- **Not done / limits:** Live run with the real Ant Ling key after merge. No learning from earlier decisions. Up to 40 rows per request. Receipts/PDF and Slides remain open.
- **Status:** Built and verified locally; PR pending owner review.

### M-021 | 2026-11-05 | Live verification of category suggestions and the Docs report; README with images
- **Source/trigger:** Owner merged PR #7 ("you know what to do") and had asked whether Ant Ling works well enough and why the README looked bland.
- **Expected:**
  - Run the new Ant Ling features on the deployed site with the real key.
  - Give the README real screenshots without misrepresenting what produced them.
- **Live check:**
  - The production deployment of the PR #7 merge `a623018` was Ready. `/api/ai/status` returned `configured: true` and `Ling-3.1-flash`. `/api/ai/categorize` exists (405 on GET). No runtime errors in 24 hours.
  - This container cannot reach vercel.app, so the browser run used a temporary Vercel Sandbox in the project (Ubuntu, Playwright 1.63.0). It was stopped afterwards after about 7 minutes, with about 1 CPU-minute active.
  - Two synthetic accounts were created, with random passwords that were never stored: `plcheckc41732` and `plcheck85a548`. Only the sample data was used.
- **Results:**
  - Category suggestions came back on the first attempt (request `21d5b11217938673261508770e77e3`, 445 tokens). T-002 → Operations (high), T-004 → Logistics (high), T-005 → Community (low), T-006 → Community (low; label kept).
  - The UI showed Confident / Check this as designed, and Build gave a Verified workbook with total 2135.00.
  - `/categories` recorded 4 decisions and skipped 0.
  - The draft summary passed on the first attempt (request `0b96a44317938675135231152e3c49`, 960 tokens) with 24 figures inserted by the engine.
  - Check figures was ok with 24/24 verified. Approve returned 200, and History shows "Report approved, every figure matched". No page errors.
- **README:**
  - New `docs/images/` holds four screenshots: the landing hero, the workspace with a claim, the category review, and the report approved.
  - They were rendered from a local production build without the Univer licence; the Ant Ling stand-in replayed the exact live replies above. So the suggestions and report wording shown are Ant Ling's real output, and the README says so.
  - The README also gained live/Univer/Ant Ling/Next.js badges, a Mermaid flow diagram, the live-check summary and a reordered walkthrough.
  - `AGENTS.md` rule 6 now names both of Ant Ling's runtime jobs.
- **Not done / limits:** The README screenshots show no chart, because a licensed render can only come from the live site. A live screenshot can replace `docs/images/workspace.jpg` later.
- **Status:** PR pending owner review.

### M-022 | 2026-11-05 | Default branch renamed to `main`; merged branches removed
- **Source/trigger:** Owner approved tidying the public repo for submission.
- **Done by owner:**
  - Renamed `p2/server-storage-audit` to `main` on GitHub; the rename kept it the default branch.
  - Deleted 8 feature branches. Each was first confirmed to have 0 commits not already on the default branch: `ai/categorize`, `ant-ling/report-drafts`, `docs/live-checks`, `docs/readme-visuals`, `landing/build-artwork`, `report/univer-docs`, `univer-pro/charts` and `workspace/redesign`.
  - The agent's own attempt was blocked by its permission policy.
- **Vercel:** Branch Tracking would not accept `main` until that branch had a deployment ("No deployments found for main"). A preview deployment of `main` at `38499ca` was created through the Vercel API (`dpl_Fwsv5vxEjCQV5fvA6Zs7JUa66k3G`) so the owner could save `main` as the production branch.
- **Verification:** This entry's own merge into `main` should create a production deployment. That shows production now follows `main`.
- **Status:** Waiting on owner to save Branch Tracking = `main`.
