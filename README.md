# Proofline — Univer-first financial evidence workspace

A **local P1 foundation**, not a released product. Budget and transaction CSVs become an editable Univer Sheets workbook. Proofline independently revalidates source cells after edits and links claims to supporting rows.

## What's real, what's next
- `lib/finance.ts`: TypeScript parser, validation, integer-cent calculations, exceptions and source-ID mapping; unit tests.
- `components/UniverPanel.tsx`: real Univer Sheets via the official `UniverSheetsCorePreset`; public Facade events detect source-cell and structural edits. Facade ranges read current values and formulas for independent revalidation. Workbook snapshots save and restore in **browser-local storage**.
- `lib/verification.ts` and `components/ClaimInspector.tsx`: stale/invalid claim withholding, integer-cent revalidation, stable transaction IDs, sheet-row provenance, previous/current values, calculation methods, and supporting records.
- **Not yet included:** server persistence, authentication, broad XLSX/schema support, Ant Ling in-app inference, document and slides reports, verified license-based Pro components.

## Run in Codex or locally

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

Open the displayed local address (typically `http://localhost:3000`). Select **Load synthetic demo** to see rows and formulas in a genuine Univer workbook. Edit a transaction amount or ID, inspect a claim, save locally, and reload. Alternatively, upload your own CSVs matching `data/` templates.

For Codex: install the current official Univer skills before major integration tasks:

```bash
npx skills add dream-num/skills --skill univer-integrate
npx skills add dream-num/skills --skill univer-pro-integrate
```

The repository pins the coordinated Univer OSS SDK packages to `1.3.1`. Their own manifests require the separately versioned `@univerjs/icons@1.46.0`; do not force icons to 1.3.1. Pin any future Pro SDK packages to the same coordinated SDK release (check actual availability and license rights first). On 2026-11-03, this extracted Windows starter installed successfully with Node `v24.22.1` and npm `11.19.1`. P1 passed 17 tests, typecheck, and production build. The production app was verified in a local browser at `http://localhost:3000`: edit → recalculate → inspect → save → reload, plus duplicate-ID and invalid-money withholding. These are local checks, not a deployment or a guarantee for other machines. See `docs/BUILD_LEDGER.md` for exact evidence and limitations.

## Credentials

P1 only uses open-source Univer Sheets and **does not need any license key in the frontend**. `.env.example` contains placeholders. Do not commit `.env.local` or paste client license keys or Ant Ling API keys into chats or Codex task prompts. Browser-visible client licenses, when permitted by Univer documentation, are different from private server keys. Verify exact edition and activation procedure before adding Pro capabilities.

The Ant Ling API is used **in Codex as a coding assistant**, per the project owner. This does not imply Ant Ling inference is integrated into the app. If the partnership requires in-app Ant Ling inference, make it a separate backend milestone and record actual successful calls.

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
