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
