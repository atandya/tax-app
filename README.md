# EasyTax Demo — Tax Filing with WebMCP

**A detailed tax form. A conversation to help you through it.**

This hackathon prototype explores how an AI assistant can help a salaried worker
complete an Indonesian individual income-tax return. **EasyTax** recreates the
shape of **Coretax**, Indonesia's tax-administration portal, and adds **WebMCP
tools** that let a compatible assistant work with the website's own forms and
saved drafts.

The idea is not to hide the form's complexity. Knowing your salary or family
situation is different from knowing which tax field or classification it belongs
in. We keep the detailed form visible, then let the assistant ask for facts in
plain language and use the website to apply them.

**[Open the live demo](https://easytax-demo.vercel.app) ·
[Start at sign-in](https://easytax-demo.vercel.app/login)**

[Starting scenario](#synthetic-data-bank) ·
[Full synthetic data bank](SYNTHETIC_DATA_BANK.md) ·
[Indonesian labels explained](#a-short-guide-to-the-indonesian-labels) ·
[Local setup](#run-a-local-copy) · [Developer reference](#developer-reference)

> **DEMONSTRATION ONLY — NONE OF THE SAMPLE DATA BELOW IS REAL.** The sample
> identities, tax IDs, login details, documents, account numbers, and financial
> records are synthetic. They are not valid government or banking records.
> Any resemblance to real people or organisations is coincidental. This project
> is not affiliated with or endorsed by Indonesia's Directorate General of Taxes
> (DJP). Government-style screens are part of the simulation. Nothing is filed
> with DJP, no real payment is made, and this is not tax advice.
> **Never enter real personal, tax, bank, or government-account information.**

## Start here — no Indonesian ID required

You do not need an Indonesian identity, employer, or tax document. Use the
synthetic account and records in this README. No installation is needed to
explore the hosted website manually.

### With an assistant that supports this site's WebMCP interface

1. Open [the demo login page](https://easytax-demo.vercel.app/login) **inside the
   compatible client's browser**. The assistant needs access to that page's tools;
   pasting its URL into an ordinary chat is not enough by itself.
2. Ask:

   > Help me file the synthetic demo taxpayer's 2025 tax return. Sign in to the
   > demo account, open the existing draft, and ask me for whatever you need,
   > one section at a time. Please explain unfamiliar terms in English. Do not
   > submit anything.

3. Answer with the scenario below. The assistant should work through the return
   in this order, calling one site tool per step and never guessing a value:

   | Step | What you say | What the website does |
   |---|---|---|
   | Profile | "I was married at the end of 2025 and supported one eligible dependent child." | Derives **`K/1`** and shows a saved-by-assistant notice |
   | Income | "My employer was PT Nusantara Digital, gross salary 180 million for the year, 6 million in pay deductions." | Records the employment slip, derives net income, recomputes the tax |
   | Withholding | "They withheld 7 million in tax; the slip is a 1721-A1." | Adds the certificate and sets the withholding credit to the sum of all slips |
   | Assets | "I have a savings account at Bank Nusantara with 85 million." | Adds the row to the cash table and updates the asset totals |
   | Dependants | "My dependant is my daughter, Siti Rahma Santoso." | Adds her to the family table; the tool never repeats her details back |
   | Debts | "No loans or credit-card balances." | Nothing to add; the assistant moves on |
   | Questions | Answer the remaining Yes/No questions the assistant reads out | Saves each answer exactly as given |

4. Reload the page. Every saved value remains, and the balance at the bottom of
   the form reflects the website's own calculation.
5. Review the form yourself. Declaration and submission stay manual; no site tool
   can do them, and the assistant should say so if asked.

The demo sign-in tool opens the fixed synthetic taxpayer's session; you do not
need to give the assistant a password. The shared draft may already contain
values from another visitor. In that case the assistant should read the current
state first and not needlessly ask for already-confirmed facts.

**Compatibility:** the website registers tools through
`document.modelContext.registerTool()`, which Chrome exposes behind the
`chrome://flags/#enable-webmcp-testing` flag from version 149 (note the API
lives on `document`, not `navigator`). Automated tests use a substitute
registry, which proves the page's contract but not native discovery in every
client. If the assistant cannot see the tools, use the manual path below.

### Without WebMCP — use the same website manually

1. Open [sign-in](https://easytax-demo.vercel.app/login). Use the **EN** language
   toggle for the entry screens; much of the tax form remains in Indonesian.
2. Enter the demo **User ID** and **Password** below, check **I'm not a robot**
   (`Saya bukan robot`), and choose **Sign In** (`Masuk`).
3. On the taxpayer dashboard, open the existing **2025** return. `Konsep SPT`
   means an editable draft. If no return exists for that year, create a **1770 S**
   draft. The app refuses a second return for a year that already exists.
4. In the main form (**Formulir induk**), find the **PTKP** selector. For the
   scenario below, choose **K/1**, then **Simpan konsep** (Save draft).
5. Use the glossary and sample records below to explore **Lampiran I** (the
   supporting tables). Saving is separate from submitting.

The hosted account is shared: edits persist and other visitors may change them.
If its return has already been submitted, it may be read-only. Ask the project
maintainer for a fresh demo draft, or run a local copy for an isolated scenario.

## Synthetic data bank

For more family identities, employers, deductions, assets, loans, and document
references, open the [full Synthetic Tax Data Bank](SYNTHETIC_DATA_BANK.md).
The example below is a starting scenario, not a restriction on your choices.

Meet **Budi Santoso**, a fictional salaried employee preparing a **2025** return.
For this example, Budi is married and supports one eligible dependent child.
He has one salary, one savings account, no loans, no other income, and no
additional charitable or religious-contribution deduction.

These are starting facts, not a required persona: you can explore other fictional
family situations and amounts. No real Indonesian documents are needed.

### Account and identity

| Field you may see | Synthetic value | What it means |
|---|---|---|
| ID Pengguna / User ID | `0912345678901234` | Use this exact ID to sign in to the existing demo account |
| Kata Sandi / Password | `Wajib2025!` | Public demo password; never reuse it for a real account |
| Nama / Name | Budi Santoso | The fictional taxpayer |
| NIK | `0912345678901234` | Sample national identity number, not a real ID |
| NPWP | `09.123.456.7-890.000` | Sample tax identification number |
| Tahun Pajak / Tax year | `2025` | The year the income relates to |
| Form type | `1770 S` | The return type supported by this WebMCP demo |
| Marital status | Married | A fact to tell the assistant; no tax code to memorise |
| Eligible dependant count | `1` | The count used in this scenario's profile |

Keep the leading zero in IDs. The login takes the digits-only **User ID**, not
the punctuated NPWP. Do not try to register the existing demo ID again.

### Family record

Tell the assistant about this child, or enter her in **Lampiran I → C: Anggota
Keluarga Tanggungan** (dependent family members) by hand.

| Field | Synthetic value |
|---|---|
| Name | Siti Rahma Santoso |
| NIK | `3275014204150002` |
| Date of birth | `2015-04-12` — 12 April 2015 |
| Relationship | `Anak Kandung` — child |
| Occupation | `Pelajar` — student |

For the profile demonstration, her eligibility is a **given fictional fact**,
not something the assistant has legally assessed. The profile tool accepts zero
to three eligible dependants; the family tool accepts any number of rows. Having
five children does not mean entering five in the profile: family records and the
supported PTKP count are separate.

### Salary and employer-issued tax record

Tell the assistant these figures, or enter them in **Lampiran I → D:
Penghasilan Neto dari Pekerjaan** (employment income) and **E: Bukti
Pemotongan / Pemungutan PPh** (tax already withheld). The deduction below
reduces gross salary to net employment income; it is **not** tax paid and is
separate from PTKP.

| Field | Synthetic value |
|---|---|
| Employer / withholding organisation | PT Nusantara Digital |
| Employer NPWP | `01.234.567.8-052.000` |
| Annual gross salary — before the employment deduction | `180000000` IDR |
| Annual employment deduction | `6000000` IDR |
| Annual net employment income — gross minus deduction | `174000000` IDR |
| Withholding slip number | `1721-2025-00001234` |
| Slip date | `2025-12-31` — 31 December 2025 |
| Tax type on the sample slip | `PPh Pasal 21` — employment income-tax withholding |
| Tax base shown on this sample slip | `180000000` IDR |
| Tax withheld by the employer | `7000000` IDR |

These sample document amounts are supplied for the prototype, not as an example
of how an employer must calculate withholding under Indonesian law. The slip's
tax-base field is not the same as the return's final taxable-income total.

### Savings account

Tell the assistant about this account, or enter it in **Lampiran I → A.1: Kas
dan Setara Kas** (cash and cash equivalents).

| Field | Synthetic value |
|---|---|
| Asset type | `012 - Tabungan` — savings |
| Bank | Bank Nusantara — fictional sample institution |
| Account number | `009876543210` |
| Account holder | Budi Santoso |
| Location | `Dalam Negeri` — in Indonesia |
| Acquisition/opening year | `2019` |
| Year-end balance | `85000000` IDR |
| Note | `Milik Sendiri` — personally owned |

**Reading amounts:** `IDR` and `Rp` mean Indonesian rupiah. All salary figures
above are **annual**, not monthly. Enter `180000000` in a numeric field; the UI
may display it as `Rp 180.000.000`. The dots group thousands, not decimal places.
Dates above use `YYYY-MM-DD`; choose the equivalent date in a date picker.

**This scenario is not a snapshot of the shared database.** The pre-filled demo
draft already includes assets, debts, and withholding records. The row-adding
tools append by default, so ask the assistant to replace the existing rows if
you want the form to match this scenario exactly, and do not add a second copy
of a record by hand. Changing the profile alone does not replace the draft or
guarantee a particular final tax balance.

## A short guide to the Indonesian labels

These explanations describe how to read this prototype, not legal filing advice.

| Label | Plain-English meaning |
|---|---|
| DJP | Indonesia's Directorate General of Taxes; this demo is independent of it |
| Wajib Pajak | Taxpayer — the person whose return you are editing |
| SPT Tahunan | Annual tax return — the report, not a payment receipt |
| NIK / NPWP | National identity number / tax identification number |
| PTKP | The personal tax-free allowance used in the demo's calculation |
| K/1 | Married, one eligible dependant; the website derives this from the two profile facts |
| Formulir induk / Lampiran I | Main return / supporting tables for financial and family records |
| Penghasilan Bruto / Neto | Gross income / net income after the relevant deduction |
| Bukti Potong | A record of tax withheld by an employer or other organisation |
| Harta / Utang | Assets / debts |
| Ya / Tidak | Yes / No |
| Simpan konsep / Konsep SPT | Save draft / draft return |
| Bayar dan lapor | “Pay and file” — a simulated submission action here; no actual payment |
| Kurang Bayar / Nihil / Lebih Bayar | Amount still due / zero balance / excess tax credit in the demo calculation |

## What the assistant can do today

The site exposes tools for sign-in, draft navigation, and every writable section
of the 1770 S return that a salaried filer uses. The assistant never has to
invent a tax code or do the arithmetic: **the website derives, validates, and
recomputes**. Manual editing and tool-based editing share the same saved return.

| Page | WebMCP tool | What it does |
|---|---|---|
| `/login` | `sign_in_demo` | Opens the fixed synthetic taxpayer session when demo mode is enabled |
| `/spt` | `list_tax_returns` | Lists the signed-in taxpayer's return summaries |
| `/spt` | `open_tax_return` | Opens an editable return |
| `/spt` | `create_tax_return` | Creates a 1770 S draft for a supported year: 2025, 2024, or 2023 |
| `/spt/[id]` | `get_tax_return_context` | Reads filing state, saved amounts, the website's computation, section counts, the Yes/No question map, and which sections are still missing; never names or identifiers |
| `/spt/[id]` | `update_taxpayer_profile` | Saves confirmed marital status and eligible-dependant count; the website derives PTKP |
| `/spt/[id]` | `update_income_and_credits` | Saves the employer, annual gross salary, pay deductions, other income, zakat, and tax credits; the website derives net income, sets the related Yes/No answers, and recomputes the tax |
| `/spt/[id]` | `add_assets` | Adds year-end asset rows (cash, receivables, investments, vehicles, property, other) by category and DJP code with current values; the website fills the matching Lampiran I sub-table and totals |
| `/spt/[id]` | `add_family_members` | Adds dependant family members by name and relationship, with NIK, birth date, and occupation only when given; results report counts, never identities |
| `/spt/[id]` | `add_debts` | Adds year-end debt rows (bank loans, credit cards, related-party loans, other) with balances and optional creditor details; results report counts and totals, never creditors |
| `/spt/[id]` | `add_withholding_slips` | Adds withholding certificates (1721-A1 and similar) by withholder, tax type, and amount; by default the website sums them into the withholding credit on line 10.a and recomputes the balance |
| `/spt/[id]` | `update_return_answers` | Saves the standalone Yes/No questions (8, 10.d, 11.b, 13.a–c, 14.b–g) exactly as the user answered them; questions that carry an amount stay with their section tools |

Every write tool follows the same rules: it validates its input before touching
the draft, refuses returns that are no longer editable, applies its change on
top of the latest form state so unsaved manual edits survive, saves the whole
document through the authenticated API, and reports back from the server's
canonical response. Each result also tells the assistant which section to ask
about next. The page registers its tools when mounted and removes them when
leaving it.

There is no separate MCP server to install for these site tools. They run in the
webpage and call its authenticated backend. An external agent client supplies
the conversation; this website does not include its own chat assistant.

### What is outside the current scope

- No tools for declaration, submission, deletion, approval, or rejection.
  Those actions remain manual. Simulated submission changes stored status and
  can make the shared draft read-only; it is not just a harmless page preview.
- No tool for the section A header dropdowns (return status, bookkeeping
  method, period, income source); the seeded defaults suit a salaried filer.
- Sections F (amendment), G (refund request and bank details), and I
  (attachments) are read-only in the form itself, so no tool writes them.
- No OCR or document-import tool, no tax-law advice service, and no
  verification of real IDs.
- No claim of complete Coretax parity, production readiness, or verified native
  discovery in every client. Manual use remains available when WebMCP is absent
  or rejected.

## Run a local copy

Use Git, Node.js and npm, and Docker with Docker Compose. This project has been
deployed using Node.js 24. The two packages have separate lockfiles; there is no
root-level npm install step. Docker is used for the **local database**, not for
hosting the Vercel apps.

```bash
git clone https://github.com/atandya/tax-app.git
cd tax-app
```

### 1. Start PostgreSQL

From the repository root, copy the example only on first setup; do not overwrite
an existing `.env` with your own settings.

```bash
cd tax-app-be
cp .env.example .env
docker compose up -d
docker compose ps
```

Wait for the database to be healthy. On a fresh volume, the init scripts create
the schema, synthetic taxpayer/admin accounts, and the sample 2025 draft.
PostgreSQL is exposed locally on port **5433**.

For demo sign-in, edit `tax-app-be/.env` and change `DEMO_LOGIN_ENABLED` to `true`.
The default `DEMO_LOGIN_USERNAME` already points at the seeded taxpayer. Only
enable this passwordless route in a synthetic demonstration environment.

### 2. Start the backend

In the same `tax-app-be` directory:

```bash
npm ci
npm run start:dev
```

Leave it running on port **3001**. Its health endpoint is
[localhost:3001/health](http://localhost:3001/health).

### 3. Start the frontend

In a second terminal, from the repository root:

```bash
cd tax-app-fe
cp .env.example .env.local
npm ci
```

Copy `.env.local` only on first setup. Edit it to set
`NEXT_PUBLIC_DEMO_LOGIN_ENABLED=true`, then run:

```bash
npm run dev
```

Open [localhost:3000/login](http://localhost:3000/login). The frontend proxies
`/api/be/*` to the backend so browser requests use a first-party session cookie.
Leave both flags false if you only want manual login.

### Environment settings

| Package | Variable | Purpose |
|---|---|---|
| Frontend | `BACKEND_URL` | Server-only backend/proxy destination; defaults to `http://localhost:3001` |
| Frontend | `NEXT_PUBLIC_DEMO_LOGIN_ENABLED` | Must be exactly `true` to register the demo sign-in tool |
| Frontend | `NEXT_PUBLIC_WEBMCP_NAVIGATION` | `soft` by default; `hard` forces full-page agent navigation |
| Backend | `DATABASE_URL` | PostgreSQL connection; local example supplied, hosted value kept secret |
| Backend | `DEMO_LOGIN_ENABLED` | Must be exactly `true` to enable passwordless synthetic-account sign-in |
| Backend | `DEMO_LOGIN_USERNAME` | Synthetic account to use; defaults to the seeded taxpayer |
| Backend | `SESSION_COOKIE` | Defaults to `coretax_session` |
| Backend | `CORS_ORIGIN` | Allowed frontend origin; local example uses `http://localhost:3000` |
| Backend | `PORT` | Local listening port; defaults to `3001` |
| Backend | `NODE_ENV` | Use `production` on the hosted backend so session cookies are Secure |

`NEXT_PUBLIC_*` variables are embedded in the browser bundle **at build time**.
Set them before `npm run build` and rebuild after changing them. Restart or
redeploy the backend after changing its demo flag. Do not put secrets in public
variables. Change navigation to `hard` only when native-client testing shows it
is needed.

The hosted setup uses separate Vercel projects for `tax-app-fe` and `tax-app-be`,
with Neon PostgreSQL. Both projects deploy from `main`. Point the frontend's
`BACKEND_URL` at the backend project's stable production domain, not at a
per-deployment URL, or the `/api/be` proxy breaks when the backend redeploys.
Demo-login flags are enabled for Production and Preview; existing deployments
need a rebuild to pick up changed environment values. Authentication uses the
app's database, never government endpoints. Local `.env` files are not uploaded
as hosted secrets.

### Checks

Run the frontend checks from `tax-app-fe`:

```bash
npm test
npm run lint
npm run build
```

Run the backend checks from `tax-app-be`:

```bash
npm test
npm run build
```

These checks do not certify native agent discovery. In a compatible client,
separately verify that the login tool is discoverable, navigation exposes the
dashboard and form tools, and a saved section survives a reload.

### Keeping or resetting local data

Database init scripts run only for a **fresh volume**. Restarting containers does
not reset accounts or drafts. `docker compose down` stops the local database
without deleting its named volume.

> **Data-loss warning:** adding `-v` to `docker compose down` deletes this Compose
> project's local database volume, including every saved account and return.
> Do not use it as a normal restart or run it against data you want to keep.
> Recreating an intentionally deleted, disposable local volume re-runs the seeds.

## Developer reference

<details>
<summary>Architecture, registration, routes, and simulated filing lifecycle</summary>

- [`tax-app-fe/`](tax-app-fe/): Next.js 16, React 19, Tailwind CSS v4.
- [`tax-app-be/`](tax-app-be/): NestJS API, cookie-based sessions, PostgreSQL via `pg`.
- [`webmcp.ts`](tax-app-fe/app/_lib/webmcp.ts): shared site-tool contracts and the canonical tool names.
- [`use-webmcp-tools.ts`](tax-app-fe/app/_lib/use-webmcp-tools.ts): page-scoped registration and cleanup.
- [`webmcp-tax-tools.ts`](tax-app-fe/app/_lib/webmcp-tax-tools.ts): the eight return-page tools, their schemas, and structured results.
- [`filing-profile.ts`](tax-app-fe/app/_lib/filing-profile.ts): confirmed profile facts, PTKP mapping, and the context the assistant reads.
- [`income-and-credits.ts`](tax-app-fe/app/_lib/income-and-credits.ts), [`assets.ts`](tax-app-fe/app/_lib/assets.ts), [`family.ts`](tax-app-fe/app/_lib/family.ts), [`debts.ts`](tax-app-fe/app/_lib/debts.ts), [`withholding-slips.ts`](tax-app-fe/app/_lib/withholding-slips.ts), [`return-answers.ts`](tax-app-fe/app/_lib/return-answers.ts): pure modules that validate one section's tool input, apply it to the draft, and summarise it without identifiers.
- [`tax.ts`](tax-app-be/src/spt/tax.ts): server-side tax calculation; the frontend mirrors it for previews.
- [`spt.ts`](tax-app-fe/app/_lib/spt.ts): form/table definitions, supported years, and UI labels.

`/register` creates a taxpayer account, opens a session, and starts with an empty
dashboard. For synthetic-only registration, the app accepts a unique 15- or
16-digit user ID, a name, an email-shaped value such as `sample@example.com`, and
a password of 8–72 characters containing uppercase, lowercase, and a digit. NPWP
is not required for registration. The verification checkbox is required. These
are the prototype's validation rules, not a statement of official ID requirements.
The demo sign-in tool always uses the fixed demo account, not a newly registered one.

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/login`, `/register` | Sign-in and synthetic-account registration |
| `/spt` | Taxpayer dashboard and draft creation |
| `/spt/[id]` | Main form and Lampiran I supporting tables |
| `/admin` | Simulated reviewer panel |

The simulated lifecycle is **Draft (`Konsep SPT`) → Waiting for payment
(`SPT Menunggu Pembayaran`) → Reported (`SPT Dilaporkan`) or Rejected
(`SPT Ditolak`)**. Manual submission requires the declaration checkbox. A
rejected return can be edited; saving returns it to Draft. None of these statuses
proves a real government filing or payment.

The local seed also creates a synthetic reviewer account (`admin` / `Admin2025!`).
It is not needed for the taxpayer/WebMCP scenario. Registration never grants the
admin role. Do not use shared-demo reviewer actions while another person is
working on a return.

</details>

<details>
<summary>Backend endpoints and supporting-table data flow</summary>

Browser calls use the frontend's `/api/be` prefix; these are the backend paths.

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Manual sign-in and session cookie |
| POST | `/auth/demo-login` | Fixed synthetic-account sign-in; 404 when disabled |
| POST | `/auth/register` | Create taxpayer account and session |
| GET | `/auth/me` | Read the current session's user |
| POST | `/auth/logout` | End the session |
| GET | `/health` | Liveness |
| GET / POST | `/spt` | List returns / create a draft; duplicate year returns 409 |
| GET / PUT | `/spt/:id` | Read / update an editable return and recompute |
| POST | `/spt/:id/submit` | Simulated submission; declaration required |
| DELETE | `/spt/:id` | Delete a draft |
| GET | `/spt/admin/all` | Reviewer listing |
| POST | `/spt/:id/approve` | Simulated approval |
| POST | `/spt/:id/reject` | Simulated rejection with a reason |

Lampiran I groups assets in A.1–A.6, their summary in A.7, debts in B, dependent
family members in C, employment income in D, and withholding records in E. The
A.7 current-value total feeds main-form field 14.a; the D net-employment-income
total feeds 1.a; the E total feeds 10.a when slips are added through the tool.
Asset rows share an `assets[]` array and are grouped by `category`. The seed
file is [`05_seed_spt.sql`](tax-app-be/db/init/05_seed_spt.sql).

</details>
