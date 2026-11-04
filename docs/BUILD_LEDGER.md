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
