# Coretax DJP — SPT Tahunan (clone)

A study clone of the Coretax DJP portal, scoped to the **SPT Tahunan** flow.

- **`tax-app-fe/`** — Next.js 16 + React 19 + Tailwind v4 frontend (landing, login, SPT).
- **`tax-app-be/`** — NestJS backend (auth + sessions) backed by PostgreSQL.
- **PostgreSQL** — runs in Docker (`tax-app-be/docker-compose.yml`).

> Not affiliated with the Directorate General of Taxes. No real government
> endpoints are called; auth runs entirely against the local database.

## Run it

**1. Database (Docker)**
```bash
cd tax-app-be
cp .env.example .env          # first time only
docker compose up -d          # postgres on host port 5433, auto-seeds schema, SPT tables,
                              # demo users (taxpayer & admin) and one pre-filled 2025 draft
```

**2. Backend (NestJS, port 3001)**
```bash
cd tax-app-be
npm install                   # first time only
npm run start:dev
```

**3. Frontend (Next.js, port 3000)**
```bash
cd tax-app-fe
npm install                   # first time only
npm run dev
```
To enable the `sign_in_demo` WebMCP tool, set `NEXT_PUBLIC_DEMO_LOGIN_ENABLED=true`
in `tax-app-fe/.env.local` (or prefix `npm run build`/`npm run dev` with it) and
`DEMO_LOGIN_ENABLED=true` in the backend `.env`.

Open http://localhost:3000.

The frontend proxies `/api/be/*` → `http://localhost:3001` (see `tax-app-fe/next.config.ts`),
so the session cookie stays first-party — no CORS needed in dev.

## Demo logins

| Role         | ID Pengguna         | Kata Sandi   | Lands on |
|--------------|---------------------|--------------|----------|
| Wajib Pajak  | `0912345678901234`  | `Wajib2025!` | `/spt`   |
| Petugas (admin) | `admin`          | `Admin2025!` | `/admin` |

## WebMCP site tools

Pages register tools with `document.modelContext.registerTool()` for agents
such as ChatGPT's in-app browser. Nothing here is a real filing; all data is
synthetic.

| Page | Tools |
|------|-------|
| `/login` | `sign_in_demo` — opens a session for the synthetic demo taxpayer (demo deployments only, no credentials) |
| `/spt` | `list_tax_returns`, `open_tax_return`, `create_tax_return` (1770 S only; refuses a year that already has a return) |
| `/spt/[id]` | `get_tax_return_context`, `update_taxpayer_profile` |

No tool declares, submits, deletes, approves, or rejects a return; those stay
manual. Browsers without WebMCP use the site as before; the only shared
change is that creating a second return for the same tax year is now refused
for everyone.

Demo sign-in is opt-in on both sides and off by default: backend
`DEMO_LOGIN_ENABLED=true` (optionally `DEMO_LOGIN_USERNAME`) and frontend build
`NEXT_PUBLIC_DEMO_LOGIN_ENABLED=true`. `NEXT_PUBLIC_WEBMCP_NAVIGATION=hard`
makes agent-triggered navigation a full page load. The `NEXT_PUBLIC_*` values
are inlined at build time, so set them before `next build`. See each package's
`.env.example`.

## Registering

`/register` creates a taxpayer account and signs it in, so a new user lands on
`/spt` with no returns yet. Rules are enforced in `RegisterDto` and mirrored
client-side so errors show before the request:

- **ID Pengguna** — 16-digit NIK or 15-digit NPWP, digits only, and unique
  (a duplicate comes back as `409 ID Pengguna sudah terdaftar.`)
- **Kata Sandi** — at least 8 characters with an upper case letter, a lower
  case letter and a digit
- **Alamat Email** — required, stored lower-cased; **NPWP** is optional
- The captcha checkbox is required, as on `/login`

The endpoint always writes `role = 'wajib_pajak'`; the admin role only comes
from `db/init/04_seed_admin.sql`, so a `role` field in the request body is
ignored.

## SPT status flow

A return moves through four statuses (Indonesian labels shown in the UI):

`Konsep SPT` (DRAFT) → **Bayar dan Lapor** → `SPT Menunggu Pembayaran`
(WAITING_PAYMENT) → petugas review → `SPT Dilaporkan` (REPORTED) **or**
`SPT Ditolak` (REJECTED). A rejected return is editable again; saving it resets
it to Konsep and clears the rejection reason so it can be resubmitted.

## Routes

| Route        | Description                                                      |
|--------------|------------------------------------------------------------------|
| `/`          | Landing page                                                     |
| `/login`     | Login (theme + ID/EN toggles, captcha, validation)               |
| `/register`  | Self-service sign-up for a new Wajib Pajak; signs you straight in |
| `/spt`       | Taxpayer dashboard — list SPT by status, create draft (redirects admins to `/admin`) |
| `/spt/[id]`  | Filling form — Induk (sections A–K, PTKP + live tax calc) and Lampiran L-1; read-only once submitted |
| `/admin`     | Petugas review panel — approve (Laporkan) or reject with reason (admin only; taxpayers redirected to `/spt`) |

## Backend API

| Method | Path                 | Notes                                        |
|--------|----------------------|----------------------------------------------|
| `POST` | `/auth/login`        | `{ username, password, captcha }` → sets `coretax_session` httpOnly cookie |
| `POST` | `/auth/demo-login`   | Demo only (`DEMO_LOGIN_ENABLED=true`): opens the synthetic taxpayer's session, no body; 404 when disabled |
| `POST` | `/auth/register`     | `{ username, fullName, email, npwp?, password, captcha }` → creates a `wajib_pajak` and opens a session |
| `GET`  | `/auth/me`           | Current user (incl. `role`) from session cookie |
| `POST` | `/auth/logout`       | Clears session                               |
| `GET`  | `/health`            | Liveness                                     |
| `GET`  | `/spt`               | List the current taxpayer's returns          |
| `POST` | `/spt`               | Create a draft `{ taxYear, formType }`; 409 if the year already has a return |
| `GET`  | `/spt/:id`           | One return (owner, or any admin)             |
| `PUT`  | `/spt/:id`           | Update draft data + recompute (DRAFT/REJECTED only) |
| `POST` | `/spt/:id/submit`    | Konsep → Menunggu Pembayaran (needs declaration) |
| `DELETE`| `/spt/:id`          | Delete a draft (DRAFT only)                  |
| `GET`  | `/spt/admin/all`     | Admin: all submitted returns (`?status=` filter) |
| `POST` | `/spt/:id/approve`   | Admin: Menunggu Pembayaran → Dilaporkan      |
| `POST` | `/spt/:id/reject`    | Admin: → Ditolak `{ reason }`                |

Tax is computed server-side (PTKP by status + UU HPP progressive brackets); the
form mirrors the same math client-side for a live preview.

## Lampiran L-1

The L-1 tab mirrors the Coretax layout table-for-table. Column definitions live
in `tax-app-fe/app/_lib/spt.ts` (`HARTA_TABLES`, `UTANG_COLUMNS`,
`KELUARGA_COLUMNS`, `PEKERJAAN_COLUMNS`, `BUKTI_POTONG_COLUMNS`) and are
rendered by the shared `SubTable` in `tax-app-fe/app/spt/[id]/form.tsx`.

| Section | Table | Columns |
|---------|-------|---------|
| A.1 | Kas dan Setara Kas | Kode, Deskripsi, Nomor Akun, Atas Nama, Nama Bank/Institusi, Lokasi Harta, Tahun Perolehan, Saldo, Keterangan — *Jumlah Tabel 1* |
| A.2 | Piutang | Kode, Deskripsi, Lokasi Penerima Pinjaman, NIK/NPWP Penerima Pinjaman, Nama Penerima Pinjaman, Tahun Dimulai, Nilai Piutang, Saldo Piutang Saat Ini, Keterangan — *Jumlah Tabel 2* |
| A.3 | Investasi/Sekuritas | Kode, Deskripsi, Lokasi Harta, NPWP + Nama Bank/Institusi/Penerima Investasi, Nomor Akun, Tahun Perolehan, Harga Perolehan, Nilai Saat Ini, Keterangan |
| A.4 | Harta Bergerak | Kode, Deskripsi, Lokasi Harta, Nomor Bukti Kepemilikan, Tahun Perolehan, Harga Perolehan, Nilai Saat Ini, Keterangan |
| A.5 | Harta Tidak Bergerak | Kode, Deskripsi, Alamat Harta, Lokasi Harta, Nomor Bukti Kepemilikan, Tahun Perolehan, Harga Perolehan, Nilai Saat Ini, Keterangan |
| A.6 | Harta Lainnya | Kode, Deskripsi, Lokasi Harta, Tahun Perolehan, Harga Perolehan, Nilai Saat Ini, Keterangan |
| A.7 | Ikhtisar Harta | Deskripsi, Harga Perolehan, Nilai Saat Ini (read-only totals across A.1–A.6) |
| B | Utang pada Akhir Tahun Pajak | Kode, Deskripsi, Kreditur (Nomor Identitas WP + Nama), Negara Kreditur, Tahun Peminjaman, Saldo, Keterangan — *Jumlah Bagian B* |
| C | Anggota Keluarga Tanggungan | Nama, NIK, Tanggal Lahir, Hubungan dengan Wajib Pajak, Pekerjaan |
| D | Penghasilan Neto dari Pekerjaan | Nama + NPWP/NIK Pemberi Kerja, Penghasilan Bruto, Pengurangan, Penghasilan Neto (derived) |
| E | Bukti Pemotongan/Pemungutan PPh | Nama + NPWP Pemotong/Pemungut, Nomor & Tanggal Bukti Potong, Jenis Pajak, Dasar Pengenaan Pajak, PPh Dipotong/Dipungut |

Two values flow back into the Induk tab: the A.7 *Nilai Saat Ini* total fills
14.a, and the D *Penghasilan Neto* total fills 1.a (`income.employment`).

Because harta rows share one `assets[]` array, each row carries a `category`
matching its A-sub-table; A.7 reads Saldo for Kas, Saldo Piutang for Piutang,
and Nilai Saat Ini everywhere else.

`db/init/05_seed_spt.sql` seeds one 2025 draft for the demo taxpayer with a row
in every L-1 table. Init scripts only run on a fresh volume — re-seed with
`docker compose down -v && docker compose up -d`.
