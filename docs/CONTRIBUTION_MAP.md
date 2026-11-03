# PROOFLINE — CONTRIBUTION AND CONTENT EVIDENCE MAP

This is not a list of marketing claims. It is a trace from actual work to potential X threads, short posts, demo clips, and project retrospectives. Update continuously and compile final posts only from **verified** entries.

## 1. UNIVER — Real Office SDK engineering
| Milestone | Real SDK capability | Proof needed | State | Post angle |
|---|---|---|---|---|
| M-001 | Next.js embeds Univer Sheets via `createUniver` + `UniverSheetsCorePreset` | Browser video showing native editing + console/network sanity + commit | Code written; runtime unverified | "We chose a real editable Office engine, not a dashboard table." |
| M-001 | Facade API `getRange().setValues()` imports evidence + spreadsheet formulas | Screen recording of imported budget/transactions and recalculated cells | Code written; runtime unverified | "One CSV → inspectable Univer workbook." |
| Future | `FWorkbook.save()` persists snapshot | Reload video showing values, formulas, edited cells intact | Code written; runtime unverified | "Persistence is an SDK feature, not a mock spreadsheet." |
| Future | Univer Docs or Slides report editing | Real Docs/Slides editor integrated and trace to source | Not started | "Verified numbers to editable report." |
| M-003 | `@univerjs/presets` and `@univerjs/preset-sheets-core` 1.3.1 render the actual Sheets editor locally | Browser observation: toolbar, grid canvas, sheet tabs, formula bar; selected C4 shows `=SUMIF(C11:C16,A4,E11:E16)` and value 890; no browser console errors | Verified locally; screenshots viewed in Codex session, no durable media file or commit | Show the formula bar and editable cells in a short clip. |
| M-003 | Facade imports both sample CSVs and `FWorkbook.save()` restores an edited snapshot | Browser observation: six transactions with IDs, C7 recalculated 80→85 after E16 edit, 85 survived reload | Verified locally; no durable media file or commit | Capture a save, reload, and recalculation clip. |
| M-005 | Public `SheetValueChanged`, `CommandExecuted`, `ActiveSheetChanged`, `SheetDeleted`, `getRange().getValues()`, `getFormulas()`, and `FWorkbook.save()` support edit detection and snapshot reload | Browser E11 edit, duplicate ID validation, save/reload, and `docs/evidence/p1-verified-after-reload.jpg` | Verified locally on OSS SDK 1.3.1; no commit/deployment | Demonstrate a real workbook cell edit feeding a separately verified claim. |
| M-006 | Univer range clearing emits an observable source-cell change | Browser cleared `A16:E16`; Proofline recalculated 5 records and 2105.00 actual; `docs/evidence/p1-record-cleared.jpg` | Verified locally; physical row-delete command not browser-verified | Show the editor's source-record removal propagating to an inspectable claim. |

## 2. ANT LING — Development assistance versus product inference
| Milestone | Actual Ant Ling use | Proof needed | State | Post angle |
|---|---|---|---|---|
| D-001 | Ant Ling API is used **inside Codex to assist building** | User confirmation; nonsecret account/model confirmation if publishable | User-reported, not independently verified | "Building Proofline with an Ant Ling-powered coding workflow." |
| Future | Ant Ling called in **Proofline backend** for text classification/explanation | Request IDs/model/version + test logs redacted + reproducible output and validation | Not started; requires client approval | "Grounded AI drafts, deterministic math verifies." |
| Future | Ant Ling generates a source-linked narrative | Demo with cited source IDs + negative/edge test | Not started | "Where the explanation came from." |
| M-003 | Ant Ling remains configured in the owner's coding workflow; no Proofline runtime call was added | User statement and code review boundary; no runtime request evidence | Development-tool role only, user-reported; runtime unverified and not claimed | Explain the coding-assistant role accurately if a build story is approved. |
| M-005 | Ant Ling remains user-reported Codex development assistance; P1 adds no Ant Ling SDK, key, network call, or backend inference | Source review and explicit UI wording; model use itself is not independently attested here | Development-only attribution; no runtime integration | Mention the coding workflow separately from the Univer and Proofline runtime work. |

**Never** label Codex model usage as in-app inference. Do not disclose API keys or private model logs.

## 3. BUILDER — Engineering lessons, problems and outcomes
| Milestone | Engineering question/obstacle | Evidence | State | Post angle |
|---|---|---|---|---|
| Q-001 | How do we retain issues and turn them into useful project stories? | Build ledger + committed issue resolution entries | Process designed | "A shipping journal, not a hype calendar." |
| M-001 | Ensure AI cannot invent or certify financial totals | `lib/finance.ts` integer-cent engine + tests | Seven unit tests passed | "The finance engine has no LLM in the math loop." |
| Future | First SDK compile/runtime failure and correction | Minimal repro, fix commit, before/after | Unknown | "The bug that taught us how Univer initializes." |
| Future | Source change invalidation/reverification | Automated test + screencast | Not started | "Change one transaction, flag stale report claims." |
| I-001 / M-003 | Next.js picked an unrelated parent lockfile and failed to trace the build | Original `EPERM readlink C:\Users\USER`, official `outputFileTracingRoot` fix, successful rebuild | Resolved and verified locally; no Git commit | Explain why project-root tracing matters on an extracted Windows starter. |
| I-002 / M-003 | Malformed quoted CSV field silently changed input | Failing regression (`"foo"bar`), parser fix, 10/10 passing tests | Resolved and verified locally; no Git commit | Show the failing test and exact parser correction. |
| M-003 | Deterministic sample figures and duplicate-ID rejection through the UI | Sample file imports: 3000.00 budget, 2135.00 actual, 890.00 Logistics, 80.00 Outreach; duplicate ID rejected at row 3 | Verified locally; browser screenshots viewed, no durable media file | Demonstrate how source IDs connect the summary to inspectable rows. |
| I-004 | Univer's icon asset package has a separate version sequence | Lockfile: 21 coordinated SDK packages at 1.3.1; six require `@univerjs/icons@1.46.0`; agent instruction corrected | Dependency graph verified; no override made | Explain why exact installed manifests beat a blanket version rule. |
| I-006 / M-005 | Workbook Date/ID columns differed from CSV validator order | Failing first P1 tests; adapter correction; 17/17 final tests | Resolved locally, no commit | Show how one small source mapping error would have blocked all financial claims. |
| I-007 / M-005 | Duplicate-ID error referred to CSV row 3 rather than sheet row 12 | Browser reproduction, parser error remapping, regression test, `docs/evidence/p1-invalid-duplicate-id.jpg` | Resolved locally, no commit | Make validation errors point to the cell users can repair. |
| M-005 | Integer-cent revalidation, stale withholding, source-to-claim provenance, and browser-local reload | 17 tests; browser E11 250→300, total 2135→2185; invalid money/ID withheld; Logistics budget row 5 and T-003/T-004 shown in `docs/evidence/p1-logistics-variance-sources.jpg` | Verified locally, no commit/deployment | Walk through edit → recalculate → inspect → save → reload with honest local-scope limits. |
| M-006 | Clear a source record without retaining an obsolete claim | Browser actual 2185→2105, count 6→5, Outreach 80→0, no current source records; screenshot and saved-snapshot reload | Verified locally; physical row deletion remains an open browser integration check | Explain why a removed transaction must change the claim and provenance together. |

## End-of-build outputs
1. 4-post product thread: announcement → actual architecture → a verified issue/fix or milestone → demonstrable launch.
2. Short posts on solved bugs and lessons, with code or screenshot evidence.
3. 30–90-second demo showing real Univer editing and correct validation.
4. Explicit Ant Ling model/dev contribution wording, distinguishing coding usage from runtime functionality.
5. Technical retrospective with honest limitations, tests and linked commits.
