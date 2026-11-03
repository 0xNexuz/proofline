# PROOFLINE — project instructions for coding agents (Codex / Ant Ling)

Read `docs/BUILD_LEDGER.md`, `docs/CONTRIBUTION_MAP.md`, and `docs/CLIENT_SCOPE.md` before any change.

## Non-negotiable rules
1. This is a Univer partnership project. Use the **real Univer SDK** for Office editing, not an imitation table. Verify behavior against the currently installed exact SDK version and current docs.
2. Use integer cents and deterministic arithmetic for verified financial amounts. Model-generated text never certifies totals.
3. Treat all financial input as untrusted. Test CSV parsing, injection, duplicates, and invalid amounts. Do not log source documents or secrets.
4. Keep coordinated `@univerjs/*` and `@univerjs-pro/*` SDK packages on exactly matching release versions. Follow the exact transitive version required for separately versioned `@univerjs/icons` (the 1.3.1 SDK packages require icons 1.46.0); do not override it to the SDK release number. Check Pro rights and license compatibility before adding features.
5. Never put `UNIVER_LICENSE_KEY`, Ant Ling API keys, or other backend secrets in the browser, Git, screenshots, or replies.
6. **Ant Ling currently powers coding through Codex.** This is *development tooling*, not evidence that the released product runs Ant Ling inference. If later requested, add explicit server-side runtime integration and test it independently.
7. Do not claim features, live integrations, benchmarks, or deployments that have not been reproduced.
8. Do not publish client details, agreement terms, data, or repo code without authorization.

## Mandatory journal procedure — every task, question, bug, and milestone
- Before coding: create the next `Q-###`, `I-###`, or `M-###` entry in `docs/BUILD_LEDGER.md` (as appropriate) with date, request, expected outcome, and status.
- After coding: record changes, test commands, test outcomes, failure details, links/paths to evidence, and unresolved work. Do not overwrite history; append chronologically.
- If the user asks a question: capture the question and the answer/decision, even if no code changed.
- If you find a bug: record reproduction steps, root cause (when established), fix, regression test, and verification status.
- After any externally demonstrable milestone: update `docs/CONTRIBUTION_MAP.md` under exactly the three contribution headings: **Univer**, **Ant Ling**, and **Builder**. Distinguish planned from demonstrated facts.
- Record social-ready evidence: screenshot paths, 10–30s clip opportunities, code evidence (commit/PR), what users can actually do, and a post idea. Avoid secrets or identifiable client data.
- Do NOT generate "Proofline is live" or release posts until an authorized, externally testable deployment exists.
- Submit PRs for review; do not merge or deploy to client infrastructure without explicit authorization.

## Current sequence
P0: SDK renders, budget and transaction CSVs validate, independent calculations, source IDs and local workbook snapshots.
P1: Persistence/auth, source-level provenance and edit revalidation, production data boundaries.
P2: Governed, grounded AI reporting (Ant Ling **runtime** only if client approves).
P3: Docs/Slides reports (license-dependent), review/approval and shareable demo.

## Required command checks
`npm test` → `npm run typecheck` → `npm run build` → real browser interaction in Codex environment.
If an external registry/network is unavailable, state that dependency or browser verification is uncompleted.
