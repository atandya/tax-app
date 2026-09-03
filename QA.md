# Quality Assurance

This repository uses layered checks for the taxpayer-profile/PTKP WebMCP
slice. The goal is to prove the public contract, persistence rules, and manual
fallback without implying that this demo is a complete tax-filing system.

## Public automated checks

### Frontend

```bash
cd tax-app-fe
npm test
npm run lint
npm run build
```

The frontend suite covers profile-to-PTKP mapping, closed tool input schemas,
structured tool results, privacy filtering, safe repeated writes, failure
handling, and browser-side persistence behavior. Lint and the production build
catch code-quality and integration problems outside those focused tests.

### Backend

```bash
cd tax-app-be
npm test
npm run build
```

The backend suite covers return ownership, editable and locked statuses,
rejected-return recovery, missing returns, persistence, and the server's
authoritative PTKP/tax computation.

## What still requires a real client

Browser contract tests can prove what the page registers and what its tool
callbacks do. They cannot prove that ChatGPT, Codex, or another native client
will discover the tools, decide when to call them, ask a good follow-up
question, or show its own safety and activity UI.

Before a release or demo, repeat the main conversation in the intended native
client and confirm:

- Only the two profile tools appear on the tax-return detail page.
- No site tools appear on login or dashboard pages.
- The client reads before writing and does not guess missing facts.
- A successful write is visible immediately and remains after reload.
- Declaration, submission, and payment stay manual because no such tools are
  exposed.
- The form still works when site tools are unavailable or disabled.

Client support is platform-dependent. A client that does not support site tools
should be recorded as unsupported rather than treated as an application bug.

## Test data and release rule

Use synthetic demo data only. This project does not connect to DJP, submit a
real tax return, or replace professional tax advice.

A release candidate is ready only when the frontend tests, frontend lint,
frontend build, backend tests, backend build, real-page end-to-end checks, and
native-client happy path all pass from a known synthetic seed. Any failed check
must be fixed or explicitly accepted before the demo; a generated report alone
is not evidence that behavior passed.

Keep public claims limited to the demonstrated 1770 S salaried-worker
taxpayer-profile/PTKP slice.
