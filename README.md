# Coretax Demo — Tax Filing with WebMCP

**A detailed tax form. A conversation to help you through it.**

This hackathon prototype explores how an AI assistant can help a salaried worker
complete an Indonesian individual income-tax return. It recreates part of
**Coretax**, Indonesia's tax-administration portal, and adds **WebMCP tools** that
let a compatible assistant work with the website's own forms and saved drafts.

The idea is not to hide the form's complexity. Knowing your salary or family
situation is different from knowing which tax field or classification it belongs
in. We keep the detailed form visible, then let the assistant ask for facts in
plain language and use the website to apply them.

**[Open the live demo](https://coretax-demo.vercel.app) ·
[Start at sign-in](https://coretax-demo.vercel.app/login)**

[Starting scenario](#synthetic-data-bank) ·
[Full synthetic data bank](SYNTHETIC_DATA_BANK.md) ·
[Indonesian labels explained](#a-short-guide-to-the-indonesian-labels) ·
[Local setup](#run-a-local-copy) · [Developer reference](#developer-reference)

> **DEMONSTRATION ONLY — NONE OF THE SAMPLE DATA BELOW IS REAL.** The sample
> identities, tax IDs, login details, documents, account numbers, and financial
> records are synthetic. They are not valid government or banking records.
> Any resemblance to real people or organisations is coincidental. This project
> is not affiliated with or endorsed by Indonesia's Directorate General of Taxes
> (DJP). Government-style branding and screens are part of the simulation.
> Nothing is filed with DJP, no real payment is made, and this is not tax advice.
> **Never enter real personal, tax, bank, or government-account information.**

## Start here — no Indonesian ID required

You do not need an Indonesian identity, employer, or tax document. Use the
synthetic account and records in this README. No installation is needed to
explore the hosted website manually.

### With an assistant that supports this site's WebMCP interface

1. Open [the demo login page](https://coretax-demo.vercel.app/login) **inside the
   compatible client's browser**. The assistant needs access to that page's tools;
   pasting its URL into an ordinary chat is not enough by itself.
2. Ask:

   > Help me with the synthetic demo taxpayer's 2025 tax return. Sign in to the
   > demo account, open the existing draft, and ask me for the profile information
   > you need. Please explain unfamiliar terms in English. Do not submit anything.

3. Use the scenario below when answering. For the profile question, say:

   > In this fictional scenario, I was married at the end of 2025 and supported
   > one eligible dependent child. Please save that profile.

4. The website should show **`K/1`**, its code for married with one eligible
   dependant, and a notice that the assistant saved the profile. Reload the page
   to see that the saved classification remains.
5. Review the remaining form yourself. The current assistant tools do **not**
   fill salary, bank, asset, or withholding fields, or submit the return.

The demo sign-in tool opens the fixed synthetic taxpayer's session; you do not
need to give the assistant a password. The page may already contain `K/1` or a
confirmed profile from another visitor. In that case, there may be no visible
code change and the assistant should not needlessly ask for already-confirmed
facts.

**Compatibility:** the current implementation registers tools through
`document.modelContext.registerTool()`. It requires a client exposing that
interface. Native client discovery and navigation still need verification;
automated tests using a substitute registry are not proof of native support.
Do not assume that every Chrome version or ChatGPT session exposes these tools.
If the assistant cannot see them, use the manual path below.

### Without WebMCP — use the same website manually

1. Open [sign-in](https://coretax-demo.vercel.app/login). Use the **EN** language
   toggle for the entry screens; much of the tax form remains in Indonesian.
2. Enter the demo **User ID** and **Password** below, check **I'm not a robot**
   (`Saya bukan robot`), and choose **Sign In** (`Masuk`).
3. On the taxpayer dashboard, open the existing **2025** return. `Konsep SPT`
   means an editable draft. If no return exists for that year, create a **1770 S**
   draft. The app refuses a second return for a year that already exists.
4. In **Induk** (the main form), find the **PTKP** selector. For the scenario
   below, choose **K/1**, then **Simpan** (Save).
5. Use the glossary and sample records below to explore **Lampiran L-1** (the
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

The following child can be entered in **Lampiran L-1 → C: Anggota Keluarga
Tanggungan** (dependent family members).

| Field | Synthetic value |
|---|---|
| Name | Siti Rahma Santoso |
| NIK | `3275014204150002` |
| Date of birth | `2015-04-12` — 12 April 2015 |
| Relationship | `Anak Kandung` — child |
| Occupation | `Pelajar` — student |

For the profile demonstration, her eligibility is a **given fictional fact**,
not something the assistant has legally assessed. The current tool accepts
zero to three eligible dependants. Having five children does not mean entering
five in that tool: family records and the supported PTKP count are separate.

### Salary and employer-issued tax record

Enter employment figures in **Lampiran L-1 → D: Penghasilan Neto dari Pekerjaan**
(employment income), and the withholding record in **E: Bukti Pemotongan /
Pemungutan PPh** (tax already withheld). The deduction below reduces gross
salary to net employment income; it is **not** tax paid and is separate from PTKP.

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

Use **Lampiran L-1 → A.1: Kas dan Setara Kas** (cash and cash equivalents).

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
draft includes additional assets, debts, and withholding records. Do not add a
second copy of an existing record when using these examples. The profile tool
preserves unrelated records, so changing it to `K/1` does not replace the draft
with this scenario or guarantee a particular final tax balance.

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
| Induk / Lampiran L-1 | Main return / supporting tables for financial and family records |
| Penghasilan Bruto / Neto | Gross income / net income after the relevant deduction |
| Bukti Potong | A record of tax withheld by an employer or other organisation |
| Harta / Utang | Assets / debts |
| Ya / Tidak | Yes / No |
| Simpan / Konsep SPT | Save / draft return |
| Bayar dan Lapor | “Pay and File” — a simulated submission action here; no actual payment |
| Kurang Bayar / Nihil / Lebih Bayar | Amount still due / zero balance / excess tax credit in the demo calculation |

## What the assistant can do today

The broader goal is conversational tax-form assistance. The implemented slice
currently covers **sign-in, draft navigation, and taxpayer-profile classification**.

| Page | WebMCP tool | What it does |
|---|---|---|
| `/login` | `sign_in_demo` | Opens the fixed synthetic taxpayer session when demo mode is enabled |
| `/spt` | `list_tax_returns` | Lists the signed-in taxpayer's return summaries |
| `/spt` | `open_tax_return` | Opens an editable return |
| `/spt` | `create_tax_return` | Creates a 1770 S draft for a supported year: 2025, 2024, or 2023 |
| `/spt/[id]` | `get_tax_return_context` | Reads filing state and missing profile facts, not the entire financial record |
| `/spt/[id]` | `update_taxpayer_profile` | Saves confirmed marital status and eligible-dependant count; updates PTKP |

The assistant does not need to invent a tax code: **the website derives and
validates it**. Manual editing and tool-based editing use the same saved return.
The page registers its tools when mounted and removes them when leaving it.

There is no separate MCP server to install for these site tools. They run in the
webpage and call its authenticated backend. An external agent client supplies
the conversation; this website does not include its own chat assistant.

### What is outside the current slice

- No WebMCP tools for salary, assets, debts, family-table rows, withholding
  records, or filling the whole return. Those form sections remain manual.
- No OCR or document-import WebMCP tool.
- No general-purpose tax-law advice service or verification of real IDs.
- No tools for declaration, submission, deletion, approval, or rejection.
  Those actions remain manual. Simulated submission changes stored status and
  can make the shared draft read-only; it is not just a harmless page preview.
- No claim of complete Coretax parity, production readiness, or verified native
  discovery. Manual use remains available when WebMCP is absent or rejected.

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
with Neon PostgreSQL. Both projects deploy from `main`. Demo-login flags are
enabled for Production and Preview; existing deployments need a rebuild to pick
up changed environment values. Authentication uses the app's database, never
government endpoints. Local `.env` files are not uploaded as hosted secrets.

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
dashboard/form tools, and a confirmed profile survives a reload.

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
- [`webmcp.ts`](tax-app-fe/app/_lib/webmcp.ts): shared site-tool contracts.
- [`use-webmcp-tools.ts`](tax-app-fe/app/_lib/use-webmcp-tools.ts): page-scoped registration and cleanup.
- [`filing-profile.ts`](tax-app-fe/app/_lib/filing-profile.ts): confirmed facts and PTKP mapping.
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
| `/spt/[id]` | Main form and L-1 supporting tables |
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

L-1 groups assets in A.1–A.6, their summary in A.7, debts in B, dependent family
members in C, employment income in D, and withholding records in E. The A.7
current-value total feeds main-form field 14.a; the D net-employment-income total
feeds 1.a. Asset rows share an `assets[]` array and are grouped by `category`.
The seed file is [`05_seed_spt.sql`](tax-app-be/db/init/05_seed_spt.sql).

</details>
