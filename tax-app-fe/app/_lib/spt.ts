// Shared SPT types + presentation helpers (client-safe: no server imports).

export type SptStatus = "DRAFT" | "WAITING_PAYMENT" | "REPORTED" | "REJECTED";

export interface SptComputation {
  totalNet: number;
  netAfterDeduction: number;
  ptkpAmount: number;
  taxableIncome: number;
  pphOwed: number;
  pphCredit: number;
  balanceDue: number;
  paymentStatus: "Nihil" | "Kurang Bayar" | "Lebih Bayar";
}

/** One row of Lampiran L-1 Bagian A. Fields are a superset of the six
 *  harta sub-tables; `category` says which sub-table (and therefore which
 *  columns) the row belongs to — see HARTA_TABLES. */
export interface AssetRow {
  category?: string;
  code?: string;
  description?: string;
  /** 1. Kas dan Setara Kas / 3. Investasi — Nomor Akun */
  accountNo?: string;
  /** 1. Kas dan Setara Kas — Atas Nama */
  holderName?: string;
  /** 1. Kas dan Setara Kas — Nama Bank/Institusi */
  institutionName?: string;
  /** 1. Kas dan Setara Kas — Saldo */
  balance?: number | string;
  /** 2. Piutang — Lokasi Penerima Pinjaman */
  borrowerLocation?: string;
  /** 2. Piutang — NIK/NPWP Penerima Pinjaman */
  borrowerId?: string;
  /** 2. Piutang — Nama Penerima Pinjaman */
  borrowerName?: string;
  /** 2. Piutang — Nilai Piutang */
  receivableValue?: number | string;
  /** 2. Piutang — Saldo Piutang Saat Ini */
  receivableBalance?: number | string;
  /** 3. Investasi — NPWP Bank/Institusi/Penerima Investasi */
  institutionNpwp?: string;
  /** 4. & 5. — Nomor Bukti Kepemilikan */
  ownershipProofNo?: string;
  /** 5. Harta Tidak Bergerak — Alamat Harta */
  address?: string;
  /** Lokasi Harta (1, 3, 4, 5, 6) */
  location?: string;
  /** Tahun Perolehan (1, 3, 4, 5, 6) / Tahun Dimulai (2) */
  year?: number | string;
  acquisitionPrice?: number | string;
  /** Nilai Saat Ini */
  value?: number | string;
  /** Keterangan */
  note?: string;
}

/** One row of Lampiran L-1 Bagian B (Utang pada Akhir Tahun Pajak). */
export interface DebtRow {
  code?: string;
  description?: string;
  /** Kreditur — Nomor Identitas WP */
  creditorId?: string;
  /** Kreditur — Nama */
  creditorName?: string;
  country?: string;
  /** Tahun Peminjaman */
  year?: number | string;
  /** Saldo */
  balance?: number | string;
  note?: string;
}

/** One row of Lampiran L-1 Bagian C. */
export interface FamilyMember {
  name?: string;
  nik?: string;
  birthDate?: string;
  relation?: string;
  job?: string;
}

/** One row of Lampiran L-1 Bagian D (Penghasilan Neto Dalam Negeri dari
 *  Pekerjaan). `net` is derived: bruto − pengurangan. */
export interface EmploymentSlip {
  employer?: string;
  employerNpwp?: string;
  gross?: number | string;
  deduction?: number | string;
  net?: number | string;
}

/** One row of Lampiran L-1 Bagian E (Daftar Bukti Pemotongan/Pemungutan). */
export interface WithholdingSlip {
  withholder?: string;
  withholderNpwp?: string;
  slipNo?: string;
  date?: string;
  taxType?: string;
  /** Dasar Pengenaan Pajak */
  taxBase?: number | string;
  /** PPh Dipotong/Dipungut */
  amount?: number | string;
}

export type YaTidak = "ya" | "tidak";

export interface SptData {
  identity?: { ptkp?: string; signer?: "wp" | "kuasa" };
  header?: {
    status?: string;
    method?: string;
    periodStart?: number | string;
    periodEnd?: number | string;
    source?: string;
  };
  income?: {
    employment?: number;
    business?: number;
    other?: number;
    foreign?: number;
  };
  deductions?: { zakat?: number };
  credits?: { withholding?: number; installment25?: number; stp25?: number };
  /** Ya/Tidak answers keyed by question id (q1a, q3, q10a, q14b, ...). */
  answers?: Record<string, YaTidak>;
  assets?: AssetRow[];
  debts?: DebtRow[];
  family?: FamilyMember[];
  employmentSlips?: EmploymentSlip[];
  withholdingSlips?: WithholdingSlip[];
  declarationAgree?: boolean;
}

export interface SptReturn {
  id: string;
  user_id: string;
  tax_year: number;
  form_type: string;
  status: SptStatus;
  data: SptData;
  pph_owed: number;
  pph_credit: number;
  balance_due: number;
  payment_status: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  computed: SptComputation;
  taxpayer_name?: string;
  taxpayer_npwp?: string | null;
  taxpayer_username?: string;
}

export const STATUS_META: Record<
  SptStatus,
  { label: string; short: string; badge: string; dot: string }
> = {
  DRAFT: {
    label: "Konsep SPT",
    short: "Konsep",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  },
  WAITING_PAYMENT: {
    label: "SPT Menunggu Pembayaran",
    short: "Menunggu Pembayaran",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  REPORTED: {
    label: "SPT Dilaporkan",
    short: "Dilaporkan",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "SPT Ditolak",
    short: "Ditolak",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
};

export const STATUS_ORDER: SptStatus[] = [
  "DRAFT",
  "WAITING_PAYMENT",
  "REPORTED",
  "REJECTED",
];

export const PTKP_OPTIONS: { code: string; label: string; amount: number }[] = [
  { code: "TK/0", label: "TK/0 — Tidak kawin, 0 tanggungan", amount: 54_000_000 },
  { code: "TK/1", label: "TK/1 — Tidak kawin, 1 tanggungan", amount: 58_500_000 },
  { code: "TK/2", label: "TK/2 — Tidak kawin, 2 tanggungan", amount: 63_000_000 },
  { code: "TK/3", label: "TK/3 — Tidak kawin, 3 tanggungan", amount: 67_500_000 },
  { code: "K/0", label: "K/0 — Kawin, 0 tanggungan", amount: 58_500_000 },
  { code: "K/1", label: "K/1 — Kawin, 1 tanggungan", amount: 63_000_000 },
  { code: "K/2", label: "K/2 — Kawin, 2 tanggungan", amount: 67_500_000 },
  { code: "K/3", label: "K/3 — Kawin, 3 tanggungan", amount: 72_000_000 },
];

export const FORM_TYPES = ["1770 SS", "1770 S", "1770"];

export function rupiah(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return "Rp " + v.toLocaleString("id-ID");
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

// ---- Client-side mirror of the backend tax computation (tax.ts) ----
// Keeps the live preview in sync without a round-trip. The backend
// remains the source of truth on save/submit.

function num(v: unknown): number {
  const n = typeof v === "string" ? Number(v.replace(/[^0-9.-]/g, "")) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function floorToThousand(v: number): number {
  return Math.floor(v / 1000) * 1000;
}

const BRACKETS: [number, number][] = [
  [60_000_000, 0.05],
  [250_000_000, 0.15],
  [500_000_000, 0.25],
  [5_000_000_000, 0.3],
  [Infinity, 0.35],
];

function progressiveTax(pkp: number): number {
  let remaining = pkp;
  let lower = 0;
  let tax = 0;
  for (const [upper, rate] of BRACKETS) {
    if (remaining <= 0) break;
    const span = Math.min(remaining, upper - lower);
    if (span > 0) {
      tax += span * rate;
      remaining -= span;
    }
    lower = upper;
  }
  return Math.round(tax);
}

export function computeSptClient(data: SptData): SptComputation {
  const inc = data.income ?? {};
  const totalNet =
    num(inc.employment) + num(inc.business) + num(inc.other) + num(inc.foreign);
  const zakat = num(data.deductions?.zakat);
  const netAfterDeduction = Math.max(0, totalNet - zakat);

  const ptkpCode = data.identity?.ptkp ?? "TK/0";
  const ptkpAmount =
    PTKP_OPTIONS.find((p) => p.code === ptkpCode)?.amount ?? 54_000_000;

  const taxableIncome = floorToThousand(
    Math.max(0, netAfterDeduction - ptkpAmount),
  );
  const pphOwed = progressiveTax(taxableIncome);

  const cr = data.credits ?? {};
  const pphCredit = num(cr.withholding) + num(cr.installment25) + num(cr.stp25);

  const diff = pphOwed - pphCredit;
  const balanceDue = Math.abs(diff);
  const paymentStatus: SptComputation["paymentStatus"] =
    diff > 0 ? "Kurang Bayar" : diff < 0 ? "Lebih Bayar" : "Nihil";

  return {
    totalNet,
    netAfterDeduction,
    ptkpAmount,
    taxableIncome,
    pphOwed,
    pphCredit,
    balanceDue,
    paymentStatus,
  };
}

// ---- Reference option lists (mirror the Coretax dropdowns) ----
export const HEADER_STATUS = ["Normal", "Pembetulan"];
export const HEADER_METHOD = ["Pencatatan", "Pembukuan"];
export const HEADER_SOURCE = [
  "Pekerjaan",
  "Usaha",
  "Pekerjaan Bebas",
  "Lainnya",
];

// ---- Lampiran L-1 ----
// Column layouts mirror the Coretax L-1 tab one-for-one.

export interface TableCol {
  key: string;
  label: string;
  kind?: "text" | "number" | "date" | "select" | "computed";
  options?: string[];
  /** For kind: "computed" — derived, read-only cell. */
  compute?: (row: Record<string, string | number | undefined>) => number;
  align?: "right";
  w?: string;
}

export const LOKASI_HARTA = ["Dalam Negeri", "Luar Negeri"];

/** Coretax renders Keterangan as a dropdown on every harta/utang table. */
export const HARTA_KETERANGAN = [
  "Milik Sendiri",
  "Harta Bersama",
  "Warisan Belum Terbagi",
  "Atas Nama Pihak Lain",
  "Lainnya",
];

export const NEGARA_OPTIONS = [
  "Indonesia",
  "Singapura",
  "Malaysia",
  "Hong Kong",
  "Jepang",
  "Australia",
  "Amerika Serikat",
  "Belanda",
  "Lainnya",
];

/** Kode harta per DJP, grouped the way Coretax groups the A sub-tables. */
export const HARTA_DESKRIPSI: Record<string, string[]> = {
  "Kas dan Setara Kas": [
    "011 - Uang tunai",
    "012 - Tabungan",
    "013 - Giro",
    "014 - Deposito",
    "019 - Setara kas lainnya",
  ],
  Piutang: [
    "021 - Piutang",
    "022 - Piutang afiliasi",
    "029 - Piutang lainnya",
  ],
  "Investasi/Sekuritas": [
    "031 - Saham yang dibeli untuk dijual kembali",
    "032 - Saham",
    "033 - Obligasi perusahaan",
    "034 - Obligasi pemerintah (ORI, SUN, SBSN)",
    "035 - Surat utang lainnya",
    "036 - Reksadana",
    "037 - Instrumen derivatif",
    "038 - Penyertaan modal pada perusahaan lain",
    "039 - Investasi lainnya",
  ],
  "Harta Bergerak": [
    "041 - Alat transportasi",
    "042 - Kapal pesiar, pesawat terbang, helikopter, jetski, peralatan olahraga khusus",
    "043 - Peralatan elektronik dan furnitur",
    "044 - Logam mulia",
    "045 - Batu mulia",
    "046 - Barang seni dan antik",
    "049 - Harta bergerak lainnya",
  ],
  "Harta Tidak Bergerak (Termasuk Tanah Bangunan)": [
    "061 - Tanah dan/atau bangunan untuk tempat tinggal",
    "062 - Tanah dan/atau bangunan untuk usaha",
    "063 - Tanah atau lahan untuk usaha",
    "069 - Harta tidak bergerak lainnya",
  ],
  "Harta Lainnya": [
    "051 - Paten",
    "052 - Royalti",
    "053 - Merk dagang",
    "059 - Harta tidak berwujud lainnya",
    "099 - Harta lainnya",
  ],
};

export const UTANG_KODE = [
  "101 - Utang bank / lembaga keuangan bukan bank",
  "102 - Kartu kredit",
  "103 - Utang afiliasi (pihak yang memiliki hubungan istimewa)",
  "109 - Utang lainnya",
];

export const JENIS_PAJAK = [
  "PPh Pasal 21",
  "PPh Pasal 22",
  "PPh Pasal 23",
  "PPh Pasal 24",
  "PPh Pasal 26",
  "PPh Final Pasal 4 ayat (2)",
];

export interface HartaTable {
  /** Stored on every row as `category`. */
  category: string;
  columns: TableCol[];
  /** Numeric columns summed into the sub-table footer, left to right. */
  totalKeys: string[];
  totalLabel?: string;
}

const KODE_COL: TableCol = { key: "code", label: "Kode", w: "w-24" };
const KETERANGAN_COL: TableCol = {
  key: "note",
  label: "Keterangan",
  kind: "select",
  options: HARTA_KETERANGAN,
  w: "w-44",
};
const LOKASI_COL: TableCol = {
  key: "location",
  label: "Lokasi Harta",
  kind: "select",
  options: LOKASI_HARTA,
  w: "w-40",
};
const deskripsiCol = (category: string): TableCol => ({
  key: "description",
  label: "Deskripsi",
  kind: "select",
  options: HARTA_DESKRIPSI[category] ?? [],
  w: "w-56",
});

/** A. Harta pada Akhir Tahun Pajak — the six Coretax sub-tables. */
export const HARTA_TABLES: HartaTable[] = [
  {
    category: "Kas dan Setara Kas",
    columns: [
      KODE_COL,
      deskripsiCol("Kas dan Setara Kas"),
      { key: "accountNo", label: "Nomor Akun", w: "w-40" },
      { key: "holderName", label: "Atas Nama", w: "w-40" },
      { key: "institutionName", label: "Nama Bank/Institusi", w: "w-44" },
      LOKASI_COL,
      { key: "year", label: "Tahun Perolehan", kind: "number", w: "w-28" },
      { key: "balance", label: "Saldo", kind: "number", align: "right", w: "w-36" },
      KETERANGAN_COL,
    ],
    totalKeys: ["balance"],
    totalLabel: "Jumlah Tabel 1",
  },
  {
    category: "Piutang",
    columns: [
      KODE_COL,
      deskripsiCol("Piutang"),
      {
        key: "borrowerLocation",
        label: "Lokasi Penerima Pinjaman",
        kind: "select",
        options: LOKASI_HARTA,
        w: "w-40",
      },
      { key: "borrowerId", label: "NIK/NPWP Penerima Pinjaman", w: "w-44" },
      { key: "borrowerName", label: "Nama Penerima Pinjaman", w: "w-44" },
      { key: "year", label: "Tahun Dimulai", kind: "number", w: "w-28" },
      { key: "receivableValue", label: "Nilai Piutang", kind: "number", align: "right", w: "w-36" },
      {
        key: "receivableBalance",
        label: "Saldo Piutang Saat Ini",
        kind: "number",
        align: "right",
        w: "w-36",
      },
      KETERANGAN_COL,
    ],
    totalKeys: ["receivableValue", "receivableBalance"],
    totalLabel: "Jumlah Tabel 2",
  },
  {
    category: "Investasi/Sekuritas",
    columns: [
      KODE_COL,
      deskripsiCol("Investasi/Sekuritas"),
      LOKASI_COL,
      {
        key: "institutionNpwp",
        label: "NPWP Bank/Institusi/Penerima Investasi",
        w: "w-44",
      },
      {
        key: "institutionName",
        label: "Nama Bank/Institusi/Penerima Investasi",
        w: "w-44",
      },
      { key: "accountNo", label: "Nomor Akun", w: "w-40" },
      { key: "year", label: "Tahun Perolehan", kind: "number", w: "w-28" },
      { key: "acquisitionPrice", label: "Harga Perolehan", kind: "number", align: "right", w: "w-36" },
      { key: "value", label: "Nilai Saat Ini", kind: "number", align: "right", w: "w-36" },
      KETERANGAN_COL,
    ],
    totalKeys: [],
  },
  {
    category: "Harta Bergerak",
    columns: [
      KODE_COL,
      deskripsiCol("Harta Bergerak"),
      LOKASI_COL,
      { key: "ownershipProofNo", label: "Nomor Bukti Kepemilikan", w: "w-44" },
      { key: "year", label: "Tahun Perolehan", kind: "number", w: "w-28" },
      { key: "acquisitionPrice", label: "Harga Perolehan", kind: "number", align: "right", w: "w-36" },
      { key: "value", label: "Nilai Saat Ini", kind: "number", align: "right", w: "w-36" },
      KETERANGAN_COL,
    ],
    totalKeys: [],
  },
  {
    category: "Harta Tidak Bergerak (Termasuk Tanah Bangunan)",
    columns: [
      KODE_COL,
      deskripsiCol("Harta Tidak Bergerak (Termasuk Tanah Bangunan)"),
      { key: "address", label: "Alamat Harta", w: "w-56" },
      LOKASI_COL,
      { key: "ownershipProofNo", label: "Nomor Bukti Kepemilikan", w: "w-44" },
      { key: "year", label: "Tahun Perolehan", kind: "number", w: "w-28" },
      { key: "acquisitionPrice", label: "Harga Perolehan", kind: "number", align: "right", w: "w-36" },
      { key: "value", label: "Nilai Saat Ini", kind: "number", align: "right", w: "w-36" },
      KETERANGAN_COL,
    ],
    totalKeys: [],
  },
  {
    category: "Harta Lainnya",
    columns: [
      KODE_COL,
      deskripsiCol("Harta Lainnya"),
      LOKASI_COL,
      { key: "year", label: "Tahun Perolehan", kind: "number", w: "w-28" },
      { key: "acquisitionPrice", label: "Harga Perolehan", kind: "number", align: "right", w: "w-36" },
      { key: "value", label: "Nilai Saat Ini", kind: "number", align: "right", w: "w-36" },
      KETERANGAN_COL,
    ],
    totalKeys: [],
  },
];

export const HARTA_CATEGORIES = HARTA_TABLES.map((t) => t.category);

/** B. Utang pada Akhir Tahun Pajak. Coretax groups the two creditor columns
 *  under a "Kreditur" header; `group` reproduces that spanning row. */
export const UTANG_COLUMNS: (TableCol & { group?: string })[] = [
  { key: "code", label: "Kode", kind: "select", options: UTANG_KODE, w: "w-44" },
  { key: "description", label: "Deskripsi", w: "w-56" },
  { key: "creditorId", label: "Nomor Identitas WP", group: "Kreditur", w: "w-44" },
  { key: "creditorName", label: "Nama", group: "Kreditur", w: "w-44" },
  {
    key: "country",
    label: "Negara Kreditur",
    kind: "select",
    options: NEGARA_OPTIONS,
    w: "w-36",
  },
  { key: "year", label: "Tahun Peminjaman", kind: "number", w: "w-28" },
  { key: "balance", label: "Saldo", kind: "number", align: "right", w: "w-36" },
  {
    key: "note",
    label: "Keterangan",
    kind: "select",
    options: HARTA_KETERANGAN,
    w: "w-40",
  },
];

export const RELATION_OPTIONS = [
  "Anak Kandung",
  "Anak Angkat",
  "Orang Tua",
  "Mertua",
  "Saudara Kandung",
  "Lainnya",
];

/** C. Daftar Anggota Keluarga yang Menjadi Tanggungan. */
export const KELUARGA_COLUMNS: TableCol[] = [
  { key: "name", label: "Nama", w: "w-56" },
  { key: "nik", label: "NIK", w: "w-44" },
  { key: "birthDate", label: "Tanggal Lahir", kind: "date", w: "w-40" },
  {
    key: "relation",
    label: "Hubungan dengan Wajib Pajak",
    kind: "select",
    options: RELATION_OPTIONS,
    w: "w-44",
  },
  { key: "job", label: "Pekerjaan", w: "w-40" },
];

/** D. Penghasilan Neto Dalam Negeri dari Pekerjaan. Neto is derived. */
export const PEKERJAAN_COLUMNS: TableCol[] = [
  { key: "employer", label: "Nama Pemberi Kerja", w: "w-56" },
  { key: "employerNpwp", label: "NPWP/NIK Pemberi Kerja", w: "w-44" },
  { key: "gross", label: "Penghasilan Bruto", kind: "number", align: "right", w: "w-36" },
  { key: "deduction", label: "Pengurangan", kind: "number", align: "right", w: "w-36" },
  {
    key: "net",
    label: "Penghasilan Neto",
    kind: "computed",
    align: "right",
    w: "w-36",
    compute: (r) => Math.max(0, num(r.gross) - num(r.deduction)),
  },
];

/** E. Daftar Bukti Pemotongan/Pemungutan PPh. */
export const BUKTI_POTONG_COLUMNS: TableCol[] = [
  { key: "withholder", label: "Nama Pemotong/Pemungut", w: "w-56" },
  { key: "withholderNpwp", label: "NPWP Pemotong/Pemungut", w: "w-44" },
  { key: "slipNo", label: "Nomor Bukti Potong", w: "w-40" },
  { key: "date", label: "Tanggal Bukti Potong", kind: "date", w: "w-40" },
  { key: "taxType", label: "Jenis Pajak", kind: "select", options: JENIS_PAJAK, w: "w-44" },
  { key: "taxBase", label: "Dasar Pengenaan Pajak", kind: "number", align: "right", w: "w-36" },
  { key: "amount", label: "PPh Dipotong/Dipungut", kind: "number", align: "right", w: "w-36" },
];

// ---- L-1 derived amounts ----
// Kas rows carry a single Saldo and Piutang rows a Nilai/Saldo pair, so the
// Ikhtisar (A.7) has to read a different column per sub-table.

export function assetAcquisition(a: AssetRow): number {
  if (a.category === "Kas dan Setara Kas") return num(a.balance);
  if (a.category === "Piutang") return num(a.receivableValue);
  return num(a.acquisitionPrice);
}

export function assetCurrentValue(a: AssetRow): number {
  if (a.category === "Kas dan Setara Kas") return num(a.balance);
  if (a.category === "Piutang") return num(a.receivableBalance);
  return num(a.value);
}

/** A.7 Ikhtisar Harta — totals across all six sub-tables. */
export function sumAssets(assets: AssetRow[] | undefined): {
  acquisition: number;
  current: number;
} {
  return (assets ?? []).reduce(
    (acc, a) => ({
      acquisition: acc.acquisition + assetAcquisition(a),
      current: acc.current + assetCurrentValue(a),
    }),
    { acquisition: 0, current: 0 },
  );
}

export function employmentNet(slip: {
  gross?: unknown;
  deduction?: unknown;
}): number {
  return Math.max(0, num(slip.gross) - num(slip.deduction));
}
