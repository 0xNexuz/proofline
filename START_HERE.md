# START HERE — CODEX DESKTOP (WINDOWS)

This is a **local-first** Proofline starter. Open the extracted `proofline-starter` folder in Codex Desktop. GitHub and cloud deployment are optional later steps, not prerequisites.

## Step 1 — Extract and open

1. Download this ZIP and use Windows **Extract All**.
2. Put the extracted `proofline-starter` folder somewhere you control, e.g. `Documents\Projects\proofline`.
3. Open **Codex** in the Windows desktop app. Choose to open or add a **local project/folder** and select that extracted folder (the one containing `AGENTS.md` and `package.json`).
4. Work from the folder itself, **not** from the ZIP and not from the parent folder.

## Step 2 — Verify tools and dependencies

Use Codex's project terminal, or PowerShell opened in the extracted folder:

```powershell
node --version
npm --version
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

Install Node.js LTS first if `node`/`npm` are not installed. The last command starts the local development server; open the URL printed in the terminal (commonly `http://localhost:3000`). If any step fails, ask Codex to diagnose and document it instead of treating the application as ready.

## Step 3 — Safe licensing

- Do not paste Univer license contents, license verification keys, or Ant Ling API keys into prompts, chat, commits or public logs.
- Never place a server license key in a `NEXT_PUBLIC_` variable or frontend bundle.
- Use `.env.local` for local server secrets where applicable; confirm authorized domains and which commercial Univer products your granted license actually enables.
- This starter uses open-source Univer SDK packages. Installing it does not activate commercial features.
- Ant Ling in your **Codex development setup** is a development-tool contribution; it does not prove the Proofline runtime calls Ant Ling.

## Step 4 — Codex kickoff prompt

You are the Proofline senior engineer working in Codex Desktop on Windows. Read `AGENTS.md` and all `docs/` files before changing code. Treat the signed client scope as authoritative. Ant Ling is being used in my Codex coding workflow; do **not** claim Proofline itself invokes the Ant Ling API until a working server-side integration is implemented and tested.

Start with P0 verification of this local starter. Install dependencies; run `npm test`, `npm run typecheck`, and `npm run build`; fix any incompatibilities against the actually installed Univer SDK and current official documentation. Run the application locally and verify a real editable Univer Sheets workbook, sample CSV import, formulas, independent totals, source IDs, and save/reload persistence. Record the exact observed results and add missing regression tests. Do not fake SDK integration or call anything tested unless a test was actually run.

Maintain `docs/BUILD_LEDGER.md` with dated questions, issues, decisions, fixes and milestones. Update `docs/CONTRIBUTION_MAP.md` with evidence separated into (1) Univer SDK product integration, (2) Ant Ling's real role as coding assistant or runtime API, and (3) NEXUZ engineering work and lessons. Log failure reproduction steps and real command outcomes. Keep license/API secrets out of code, prompts and logs. Do not turn on licensed features until entitlement and domain authorization are verified.

Finish by reporting files changed, commands and test results, browser verification, any blockers, and the recommended next milestone. You may create a local Git branch and commits after verifying work; do not push, deploy, or make the repository public without approval.

## Step 5 — GitHub, after local verification

Once P0 is working, optionally create a **private** `0xNexuz/proofline` repository, initialize Git locally, and push the reviewed code. Keep `.env.local` excluded and make sure no license/API secrets are committed.

## Definition of P0 complete

A real Univer editor loads and is editable; the CSV import produces the expected financial workbook; independent totals match the sample source data; persistence works after reload; and the tested outcome is recorded. If not, log and resolve the blockers first.
