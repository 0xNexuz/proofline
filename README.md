# Proofline — Univer-first financial evidence workspace

A **P2 foundation and hosted demo**, not a released financial product. Budget and transaction CSVs become an editable Univer Sheets workbook. Proofline independently revalidates source cells after edits, links claims to supporting rows, and saves authenticated private revisions on local SQLite or hosted PostgreSQL.

Hosted demo: https://proofline-alpha.vercel.app/ (free Vercel and Neon resources; use synthetic data for evaluation). Source: private GitHub repository `0xNexuz/proofline`.

## What's real, what's next
- `lib/finance.ts`: TypeScript parser, validation, integer-cent calculations, exceptions and source-ID mapping; unit tests.
- `components/UniverPanel.tsx`: real Univer Sheets via the official `UniverSheetsCorePreset`; public Facade events detect source-cell and structural edits. Facade ranges read current values and formulas for independent revalidation. Legacy browser-local snapshots remain available.
- `lib/verification.ts` and `components/ClaimInspector.tsx`: stale/invalid claim withholding, integer-cent revalidation, stable transaction IDs, sheet-row provenance, previous/current values, calculation methods, and supporting records.
- `lib/server/`, `app/api/`, and `components/AccountPanel.tsx`: SQLite locally and PostgreSQL on Vercel, authenticated accounts, owner-scoped APIs, private versioned snapshots, source/claim rows, revision conflicts, retry keys, and append-only application audit. Local development binds to `127.0.0.1` by default.
- **Not yet included:** tested hosted backup/restore, broad XLSX/schema support, document and slides reports, or a production security assessment.

## Run in Codex or locally

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

Open `http://localhost:3000` for the build-story landing page, or go straight to the workspace at `http://localhost:3000/app`. Select **Load synthetic demo** to see rows and formulas in a genuine Univer workbook. Edit a transaction amount or ID, inspect a claim, create a local account, save a private server revision, and reload/open it. Alternatively, upload CSVs matching `data/` templates. Existing P1 browser-local data stays in localStorage; after signing in, select **Import local P1 workbook to server** to create a separate private revision without deleting the local copy.

Server data lives in ignored `.proofline-data/proofline.sqlite` by default; set `PROOFLINE_DATA_DIR` to another local private directory if needed. Back up this database before clearing the project folder. Hosted runs use PostgreSQL through a private `DATABASE_URL` (or `POSTGRES_URL`) supplied by the platform; Vercel refuses to start workbook storage without one. The local SQLite database is not automatically copied to PostgreSQL. Browser localStorage is origin-scoped: localhost P1 copies cannot be read directly by the hosted site. Upload the original CSVs on the hosted site, or import a P1 browser-local copy that was saved on that same site. Neither path deletes the localhost data. Authenticated workbooks do not auto-open on sign-in. A browser-local P1 copy remains shared by anyone using that browser profile.

Physical row insert/delete and structural move/reorder/sort commands deliberately withhold claims until a fresh validated CSV import. The application does not certify those operations. Ordinary source-cell paste is revalidated and duplicate IDs are rejected. Do not treat the workbook's visible formulas as certified financial claims.

For Codex: install the current official Univer skills before major integration tasks:

```bash
npx skills add dream-num/skills --skill univer-integrate
npx skills add dream-num/skills --skill univer-pro-integrate
```

The repository pins the coordinated Univer OSS SDK packages to `1.3.1`. Their own manifests require the separately versioned `@univerjs/icons@1.46.0`; do not force icons to 1.3.1. Pin any future Pro SDK packages to the same coordinated SDK release (check actual availability and license rights first). On 2026-11-03, this Windows starter used Node `v24.22.1` and npm `11.19.1`. P2 passed 25 tests, typecheck, and production build; local and hosted browser flows verified private save/reload, audit, and real Univer edits. See `docs/BUILD_LEDGER.md` for exact evidence and limitations.

## Credentials

Without a license, Proofline runs open-source Univer Sheets only. Setting `NEXT_PUBLIC_UNIVER_LICENSE` to the contents of Univer's `license.txt` (the browser license, designed by Univer to be sent to the client) loads the licensed preset lazily and adds a Budget vs actual chart to each imported workbook. `licenseKey.txt` is a server secret for a future Univer server and is never exposed to the browser. `.env.example` contains placeholders. Do not commit `.env.local`, the private SQLite database, client license keys, or Ant Ling API keys. Browser-visible client licenses, when permitted by Univer documentation, are different from private server keys. Verify exact edition and activation procedure before adding Pro capabilities.

**Ant Ling report drafting.** With `ANT_LING_API_KEY` set on the server, signed-in users can draft a short summary of a saved, verified revision (`POST /api/workbooks/{id}/report`). Ant Ling writes the wording only. Every figure and transaction ID must appear as a fact token such as `{{total:actual}}`, which Proofline replaces with its own integer-cent value. A draft containing any other number, percentage or spelled-out number is rejected and retried once. Only verified totals, category names and transaction IDs are sent (no files or descriptions). `GET /api/ai/status` reports whether drafting is configured, without exposing the key. Live calls against Ant Ling's API are recorded in the build ledger once they have actually succeeded.

## Project evidence log

- `AGENTS.md` — coding agent instructions, including mandatory journaling.
- `docs/BUILD_LEDGER.md` — append-only Q/I/D/M log.
- `docs/CONTRIBUTION_MAP.md` — traceable Univer / Ant Ling / Builder public contributions.
- `docs/CLIENT_SCOPE.md` — agreement points to establish.
- `docs/ACCEPTANCE.md` — observable evidence checklist.

## Official sources
- Univer Next.js: https://docs.univer.ai/guides/sheets/getting-started/integrations/nextjs
- Univer Sheets Facade: https://docs.univer.ai/guides/sheets/features/core/range-selection
- Univer snapshot: https://docs.univer.ai/guides/sheets/features/core/sheets-api
- Official SDK skills: https://github.com/dream-num/skills
- Univer Pro licensing: https://docs.univer.ai/guides/server-integration/license
- Univer server integration boundary: https://docs.univer.ai/server
- Node SQLite API: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- Vercel Marketplace PostgreSQL: https://vercel.com/docs/marketplace-storage
