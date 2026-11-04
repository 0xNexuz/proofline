# First vertical slice — acceptance checklist

- [x] `npm install` succeeds on selected compatible Node version.
- [x] `npm test` passes (25 tests, including P1 edit, P2 auth/storage/audit, structural restriction and provenance cases).
- [x] `npm run typecheck` succeeds.
- [x] `npm run build` succeeds.
- [x] Browser opens native Univer Sheets editor without blank canvas or runtime errors.
- [x] CSV template headers validated and duplicate IDs rejected.
- [x] Synthetic sample loads 6 transactions and all 4 categories.
- [x] Independent numbers are reproducible: budget 3000.00; actual 2135.00; logistics 890.00 exceeds budget 700.00; Outreach unbudgeted 80.00.
- [x] Workbook displays formulas with values; compare row outputs to deterministic engine.
- [x] Edit a cell; save; reload; confirm workbook snapshot reflects the edit.
- [x] Private GitHub source, tracked-file scan and synthetic screenshot review found no credential, customer data or commercial license. Hosted browser verification used only synthetic records.
- [x] Record durable P1 screenshots of the live Univer editor, verified claims, invalid claims and source inspection (`docs/evidence/`).
- [x] Update build ledger and contribution map with actual test results.

Local P0, P1 and P2 verification is recorded in `docs/BUILD_LEDGER.md` M-003, M-005 and M-008. The P2 branch is pushed to private GitHub; hosted verification is recorded in the later ledger entries.

## P1 acceptance

- [x] Public Univer Facade events detect cell edits; workbook ranges supply values and formulas for independent validation.
- [x] Relevant edits withhold current claims until deterministic integer-cent revalidation completes.
- [x] Duplicate transaction IDs, invalid money and source formulas leave claims invalid; row deletion and ID remapping are covered by automated tests.
- [x] The claim inspector shows method, previous/updated value, status and source row/record references.
- [x] Browser flow: E11 250.00→300.00 changed total actual 2135.00→2185.00; duplicate ID and invalid amount withheld totals; repair restored verification; save/reload revalidated the persisted 2185.00.
- [x] `npm test` 17/17, `npm run typecheck`, `npm run build`, local HTTP 200, and browser console error check passed.
- [x] Durable screenshots: `docs/evidence/p1-verified-after-reload.jpg`, `docs/evidence/p1-invalid-duplicate-id.jpg`, and `docs/evidence/p1-logistics-variance-sources.jpg`.
- [x] Browser source-record clear: clearing `A16:E16` changed actual 2185.00→2105.00, transaction count 6→5, and Outreach actual 80.00→0.00; saved snapshot reload restored the six-record workbook. Evidence: `docs/evidence/p1-record-cleared.jpg`.
- [x] Observe an actual physical sheet-row deletion through Univer's browser UI. Deleting row 11 withheld current claims, and the invalid private revision stayed invalid on reload (`docs/evidence/p2-row-delete-withheld.jpg`).

## P2 acceptance

- [x] Verified P1 baseline committed as `6a3f38f` on `main`; P2 work pushed on `p2/server-storage-audit` to private `0xNexuz/proofline`. Vercel deployment and free Neon PostgreSQL used no paid plan.
- [x] Authentication and owner-scoped API prevent a second test account from listing or opening the first account's workbook; direct API access returned `Workbook not found`.
- [x] Private SQLite-backed snapshots retain workbook unit ID, source records, budgets, claims, schema version, revision metadata and historical revisions. Same-origin writes, hashed credentials/sessions, retry keys and revision conflicts have automated coverage.
- [x] Explicit P1 localStorage import preserved the local copy. A real Univer date-serial migration failure was recorded as invalid; corrected import and independent server verification succeeded.
- [x] Append-only application audit records actor, time, action, record IDs, before/after and claim impact; database trigger rejects update/delete. No tamper-proof or compliance certification claim.
- [x] Browser edit → stale → verified calculation → private save → reload/open → claim inspection and audit completed with synthetic data. Durable screenshots: `docs/evidence/p2-private-revision-audit.jpg` and `docs/evidence/p2-access-denied.jpg`.
- [x] Physical row delete and insert in Univer withheld claims; a deleted-row snapshot saved as invalid revision 3 and remained withheld after reload. Source-cell paste revalidated a changed amount. Automated tests cover inserted rows, whole-record order mapping, duplicate pasted IDs and structural command classification.
- [ ] Actual row rearrangement through the browser UI. A row-header drag selected rows but did not move them; recognized move/reorder/sort commands are deliberately unverified until a fresh validated import. This restriction is documented in README and BUILD_LEDGER.
- [x] `npm test` 25/25, `npm run typecheck`, `npm run build`, production HTTP 200 on `127.0.0.1:3000`.
- [x] Hosted Vercel and PostgreSQL flow: synthetic account, real Univer E11 edit 250→305, independent actual 2135→2190, private revision 1→2, browser reload/open and two audit events. Evidence: `docs/evidence/p2-vercel-live.png`.
- [x] Live PostgreSQL integration test: owner isolation, revisions, conflicts, retry idempotency and append-only audit trigger.
- [ ] Tested backup/restore, multi-host sessions, external security assessment and client license entitlement verification. Hosted demo is not a production assurance claim.
- [ ] Automatic migration of localhost localStorage or SQLite data to Vercel. Browser storage is origin-scoped; original CSVs can be uploaded at the hosted site. Same-origin localStorage import remains supported and tested locally.

Never mark a box checked solely because code exists. Execute the check.
