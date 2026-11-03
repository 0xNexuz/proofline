# First vertical slice — acceptance checklist

- [x] `npm install` succeeds on selected compatible Node version.
- [x] `npm test` passes (17 tests, including P1 edit, invalidation, row-deletion and provenance cases).
- [x] `npm run typecheck` succeeds.
- [x] `npm run build` succeeds.
- [x] Browser opens native Univer Sheets editor without blank canvas or runtime errors.
- [x] CSV template headers validated and duplicate IDs rejected.
- [x] Synthetic sample loads 6 transactions and all 4 categories.
- [x] Independent numbers are reproducible: budget 3000.00; actual 2135.00; logistics 890.00 exceeds budget 700.00; Outreach unbudgeted 80.00.
- [x] Workbook displays formulas with values; compare row outputs to deterministic engine.
- [x] Edit a cell; save; reload; confirm workbook snapshot reflects the edit.
- [ ] No key, private data or client license appears in GitHub or browser logs.
- [x] Record durable P1 screenshots of the live Univer editor, verified claims, invalid claims and source inspection (`docs/evidence/`).
- [x] Update build ledger and contribution map with actual test results.

Local P0 and P1 verification on 2026-11-03 is recorded in `docs/BUILD_LEDGER.md` M-003 and M-005. The GitHub/secret assertion remains open because this extracted folder has no Git repository or remote; no GitHub content was inspected.

## P1 acceptance

- [x] Public Univer Facade events detect cell edits; workbook ranges supply values and formulas for independent validation.
- [x] Relevant edits withhold current claims until deterministic integer-cent revalidation completes.
- [x] Duplicate transaction IDs, invalid money and source formulas leave claims invalid; row deletion and ID remapping are covered by automated tests.
- [x] The claim inspector shows method, previous/updated value, status and source row/record references.
- [x] Browser flow: E11 250.00→300.00 changed total actual 2135.00→2185.00; duplicate ID and invalid amount withheld totals; repair restored verification; save/reload revalidated the persisted 2185.00.
- [x] `npm test` 17/17, `npm run typecheck`, `npm run build`, local HTTP 200, and browser console error check passed.
- [x] Durable screenshots: `docs/evidence/p1-verified-after-reload.jpg`, `docs/evidence/p1-invalid-duplicate-id.jpg`, and `docs/evidence/p1-logistics-variance-sources.jpg`.
- [x] Browser source-record clear: clearing `A16:E16` changed actual 2185.00→2105.00, transaction count 6→5, and Outreach actual 80.00→0.00; saved snapshot reload restored the six-record workbook. Evidence: `docs/evidence/p1-record-cleared.jpg`.
- [ ] Observe an actual physical sheet-row deletion through Univer's browser UI. The grid-adapter deletion behavior has a passing unit test; live structural-command verification remains open.

Never mark a box checked solely because code exists. Execute the check.
