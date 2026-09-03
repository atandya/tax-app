import type { Lang } from "./i18n";

/**
 * Text for the return form and its contextual guide panel.
 *
 * Kept apart from the app-chrome dictionary in `i18n.ts` because it is a
 * different kind of content: the statutory line labels of the SPT 1770,
 * translated rather than written. Section keys double as guide-card keys, so
 * a section and its guide can never drift apart.
 */

export interface GuideCard {
  /** Guide-card title — `headline-sm`, Inter 600, sentence case. */
  title: string;
  /** One or two sentences. Caps at ~55 characters per line in the panel. */
  body: string;
  /** Optional decision points, shown as a short list. */
  points?: string[];
}

export type SectionKey =
  | "header"
  | "identity"
  | "income"
  | "tax"
  | "credits"
  | "balance"
  | "amendment"
  | "refund"
  | "installment"
  | "other"
  | "attachments"
  | "declaration"
  | "assets"
  | "debts"
  | "family"
  | "employment"
  | "withholding";

interface SptDict {
  /* page chrome */
  pageTitle: string;
  breadcrumbReturns: string;
  tabInduk: string;
  tabL1: string;
  guideTitle: string;
  guideIntro: string;

  /* actions */
  back: string;
  saveDraft: string;
  saving: string;
  unsavedMark: string;
  submit: string;
  submitting: string;
  amountDue: string;

  /* messages */
  msgSaved: string;
  msgDeclarationRequired: string;
  msgSubmitted: string;
  msgRejected: string;
  msgAgentPtkp: (code: string) => string;
  msgAgentIncome: string;
  msgAgentAssets: (count: number) => string;
  msgAgentFamily: (count: number) => string;
  msgAgentDebts: (count: number) => string;
  msgAgentWithholding: (count: number) => string;
  msgAgentAnswers: (count: number) => string;

  /* shared form vocabulary */
  yes: string;
  no: string;
  choose: string;
  none: string;
  addRow: string;
  clearRows: string;
  removeRow: string;
  noRows: string;
  rowNumber: string;
  action: string;
  total: string;
  unconfirmed: string;
  unconfirmedHint: string;
  filingStatus: string;

  /* section headings */
  section: Record<SectionKey, string>;
  /* contextual guide, one card per section */
  guide: Record<SectionKey, GuideCard>;

  /* row + question labels, keyed by their SPT line number where they have one */
  row: Record<string, string>;
  /* the sentence under a question that explains the current answer */
  hint: Record<string, { yes: string; no: string }>;
}

const id: SptDict = {
  pageTitle: "SPT Tahunan PPh Wajib Pajak Orang Pribadi",
  breadcrumbReturns: "SPT saya",
  tabInduk: "Formulir induk",
  tabL1: "Lampiran I",
  guideTitle: "Panduan pengisian",
  guideIntro:
    "Panduan di panel ini mengikuti bagian formulir yang sedang Anda isi.",

  back: "Kembali",
  saveDraft: "Simpan konsep",
  saving: "Menyimpan...",
  unsavedMark: "Ada perubahan belum tersimpan",
  submit: "Bayar dan lapor",
  submitting: "Mengirim...",
  amountDue: "Nilai yang harus dibayar",

  msgSaved: "Konsep tersimpan.",
  msgDeclarationRequired:
    "Centang pernyataan pada bagian K sebelum melaporkan SPT.",
  msgSubmitted: "SPT terkirim dan menunggu peninjauan petugas.",
  msgRejected: "SPT ditolak petugas. Perbaiki isian lalu kirim ulang.",
  msgAgentPtkp: (code) =>
    `Status PTKP ${code} tersimpan melalui bantuan asisten.`,
  msgAgentIncome:
    "Penghasilan dan kredit pajak tersimpan melalui bantuan asisten. Pajak dihitung ulang.",
  msgAgentAssets: (count) =>
    `${count} baris harta tersimpan melalui bantuan asisten.`,
  msgAgentFamily: (count) =>
    `${count} anggota keluarga tersimpan melalui bantuan asisten.`,
  msgAgentDebts: (count) =>
    `${count} baris utang tersimpan melalui bantuan asisten.`,
  msgAgentWithholding: (count) =>
    `${count} bukti potong tersimpan melalui bantuan asisten. Kredit pajak diperbarui.`,
  msgAgentAnswers: (count) =>
    `${count} jawaban pertanyaan tersimpan melalui bantuan asisten.`,

  yes: "Ya",
  no: "Tidak",
  choose: "Silakan pilih",
  none: "Tidak ada",
  addRow: "Tambah baris",
  clearRows: "Kosongkan tabel",
  removeRow: "Hapus baris",
  noRows: "Belum ada data pada tabel ini.",
  rowNumber: "No.",
  action: "Aksi",
  total: "Jumlah",
  unconfirmed: "Belum dikonfirmasi",
  unconfirmedHint:
    "Status perkawinan dan jumlah tanggungan belum dikonfirmasi.",
  filingStatus: "Status SPT",

  section: {
    header: "Ketentuan pelaporan",
    identity: "A. Identitas wajib pajak",
    income: "B. Ikhtisar penghasilan neto",
    tax: "C. Penghitungan pajak terutang",
    credits: "D. Kredit pajak",
    balance: "E. PPh kurang atau lebih bayar",
    amendment: "F. Pembetulan",
    refund: "G. Permohonan pengembalian",
    installment: "H. Angsuran PPh Pasal 25 tahun berikutnya",
    other: "I. Pernyataan transaksi lainnya",
    attachments: "J. Lampiran tambahan",
    declaration: "K. Pernyataan",
    assets: "A. Harta pada akhir tahun pajak",
    debts: "B. Utang pada akhir tahun pajak",
    family: "C. Anggota keluarga yang menjadi tanggungan",
    employment: "D. Penghasilan neto dalam negeri dari pekerjaan",
    withholding: "E. Daftar bukti pemotongan atau pemungutan PPh",
  },

  guide: {
    header: {
      title: "Mulai dari sini",
      body: "Bagian ini menetapkan tahun pajak yang dilaporkan dan cara Anda mencatat penghasilan.",
      points: [
        "Normal untuk pelaporan pertama tahun ini.",
        "Pembetulan jika Anda memperbaiki SPT yang sudah dikirim.",
        "Pencatatan untuk karyawan; pembukuan untuk usaha.",
      ],
    },
    identity: {
      title: "Data Anda sudah terisi",
      body: "Identitas diambil dari akun Anda dan tidak dapat diubah di sini. Perbarui lewat profil wajib pajak bila ada yang keliru.",
    },
    income: {
      title: "Kumpulkan penghasilan setahun",
      body: "Jawab setiap pertanyaan dengan Ya hanya jika Anda benar-benar menerima jenis penghasilan tersebut.",
      points: [
        "Penghasilan dari pekerjaan diisi di Lampiran I bagian D.",
        "Angka yang diminta adalah penghasilan neto, bukan bruto.",
        "Jawaban Tidak akan menolkan nilainya.",
      ],
    },
    tax: {
      title: "Bagaimana pajak dihitung",
      body: "Penghasilan neto dikurangi PTKP menghasilkan penghasilan kena pajak, lalu tarif progresif diterapkan.",
      points: [
        "PTKP bergantung pada status kawin dan jumlah tanggungan.",
        "Penghasilan kena pajak dibulatkan ke bawah ke ribuan penuh.",
        "Tarif berjenjang dari 5% hingga 35%.",
      ],
    },
    credits: {
      title: "Pajak yang sudah Anda bayar",
      body: "Kredit pajak mengurangi PPh terutang. Isi sesuai bukti potong dan bukti setor yang Anda miliki.",
      points: [
        "PPh dipotong pihak lain ada pada bukti potong 1721-A1.",
        "Angsuran Pasal 25 adalah setoran bulanan Anda sendiri.",
      ],
    },
    balance: {
      title: "Kurang bayar atau lebih bayar",
      body: "Selisih antara PPh terutang dan kredit pajak menentukan apakah Anda masih harus membayar atau berhak atas pengembalian.",
    },
    amendment: {
      title: "Hanya untuk pembetulan",
      body: "Lewati bagian ini kecuali status SPT pada bagian atas Anda set sebagai Pembetulan.",
    },
    refund: {
      title: "Jika SPT Anda lebih bayar",
      body: "Bagian ini aktif hanya ketika hasil perhitungan menunjukkan lebih bayar. Rekening harus atas nama Anda sendiri.",
    },
    installment: {
      title: "Angsuran tahun depan",
      body: "Menentukan apakah Anda perlu menyetor angsuran PPh Pasal 25 secara bulanan pada tahun pajak berikutnya.",
    },
    other: {
      title: "Pernyataan penutup",
      body: "Pertanyaan-pertanyaan ini melengkapi gambaran keuangan Anda di luar penghasilan dan pajaknya.",
      points: [
        "Nilai harta diambil otomatis dari Lampiran I bagian A.",
        "Jawab jujur; angka tidak perlu diisi di halaman ini.",
      ],
    },
    attachments: {
      title: "Berkas pendukung",
      body: "Pada prototipe ini tidak ada berkas yang perlu diunggah. Daftar ditampilkan agar cakupan formulir tetap terlihat.",
    },
    declaration: {
      title: "Langkah terakhir",
      body: "Centang pernyataan untuk menegaskan isian Anda benar, lengkap, dan jelas. Tanpa centang ini SPT tidak dapat dikirim.",
    },
    assets: {
      title: "Harta pada akhir tahun",
      body: "Catat posisi harta per 31 Desember tahun pajak, dikelompokkan menurut jenisnya.",
      points: [
        "Harga perolehan adalah nilai saat Anda memperolehnya.",
        "Kosongkan tabel yang tidak relevan bagi Anda.",
      ],
    },
    debts: {
      title: "Utang pada akhir tahun",
      body: "Cantumkan saldo pokok utang yang masih berjalan pada akhir tahun pajak.",
    },
    family: {
      title: "Tanggungan menentukan PTKP",
      body: "Maksimal tiga tanggungan diperhitungkan. Setiap tanggungan menaikkan PTKP Anda.",
    },
    employment: {
      title: "Salin dari bukti potong",
      body: "Setiap baris mewakili satu pemberi kerja. Penghasilan neto dihitung otomatis dari bruto dikurangi pengurangan.",
      points: [
        "Jumlah kolom neto masuk ke bagian B baris 1.a.",
        "Gunakan angka pada bukti potong 1721-A1.",
      ],
    },
    withholding: {
      title: "Bukti potong yang Anda terima",
      body: "Daftar ini mendukung kredit pajak yang Anda klaim pada bagian D formulir induk.",
    },
  },

  row: {
    taxYear: "Tahun pajak",
    status: "Status SPT",
    method: "Metode pencatatan",
    period: "Periode pembukuan",
    source: "Sumber penghasilan",
    npwp: "NIK atau NPWP",
    name: "Nama",
    idType: "Jenis identitas",
    idNumber: "Nomor identitas",
    phone: "Nomor telepon",
    email: "Alamat email",
    spouseStatus: "Status kewajiban perpajakan suami dan istri",
    spouseNpwp: "NIK atau NPWP suami atau istri",

    q1a: "Apakah Anda menerima penghasilan dalam negeri dari pekerjaan?",
    q1b: "Apakah Anda menerima penghasilan dalam negeri dari usaha atau pekerjaan bebas?",
    q1c: "Apakah Anda menerima penghasilan dalam negeri lainnya?",
    q1d: "Apakah Anda menerima penghasilan dari luar negeri?",

    r2: "Penghasilan neto setahun",
    q3: "Apakah terdapat pengurang penghasilan neto seperti kompensasi kerugian atau zakat?",
    r4: "Penghasilan neto setelah pengurang",
    r5: "Penghasilan tidak kena pajak",
    r6: "Penghasilan kena pajak",
    r7: "PPh terutang",
    q8: "Apakah terdapat pengurang PPh terutang?",
    r9: "PPh terutang setelah pengurang",

    q10a: "Apakah terdapat PPh yang telah dipotong atau dipungut pihak lain?",
    r10b: "Angsuran PPh Pasal 25",
    r10c: "STP PPh Pasal 25, hanya pokok pajak",
    q10d: "Apakah Anda menerima pengembalian atas kredit PPh luar negeri yang telah dikreditkan?",

    r11a: "PPh kurang atau lebih bayar",
    q11b: "Apakah terdapat surat keputusan pengangsuran atau penundaan pembayaran pajak?",
    r11c: "PPh yang masih harus dibayar",

    r12a: "PPh kurang atau lebih bayar pada SPT yang dibetulkan",
    r12b: "PPh kurang atau lebih bayar karena pembetulan",

    refundRequest: "PPh lebih bayar dimohonkan untuk",
    accountNumber: "Nomor rekening",
    bankName: "Nama bank",
    accountHolder: "Nama pemilik rekening",

    q13a: "Apakah Anda menerima penghasilan teratur dan wajib membayar angsuran PPh Pasal 25 tahun berikutnya?",
    q13b: "Apakah Anda menyusun perhitungan tersendiri untuk angsuran PPh Pasal 25 tahun berikutnya?",
    q13c: "Apakah Anda membayar angsuran PPh Pasal 25 OPPT tahun berikutnya?",

    r14a: "Harta pada akhir tahun pajak",
    q14b: "Apakah Anda memiliki utang pada akhir tahun pajak?",
    q14c: "Apakah Anda menerima penghasilan yang dikenakan PPh bersifat final?",
    q14d: "Apakah Anda menerima penghasilan yang bukan objek pajak?",
    q14e: "Apakah Anda melaporkan biaya penyusutan atau amortisasi fiskal?",
    q14f: "Apakah Anda melaporkan biaya entertainment, promosi, natura, atau piutang tak tertagih?",
    q14g: "Apakah Anda menerima dividen atau penghasilan lain dari luar negeri sebagai bukan objek pajak?",
    r14h: "Kelebihan PPh final atas peredaran bruto tertentu yang dapat dimintakan pengembalian",

    attachA: "Laporan keuangan",
    attachB: "Bukti pembayaran zakat atau sumbangan keagamaan",
    attachC: "Bukti potong untuk kredit pajak luar negeri",
    attachD: "Surat kuasa khusus",
    attachE: "Dokumen lainnya",
    attachNone: "Tidak ada berkas yang perlu dilampirkan",
    attachSimple: "Tidak, metode pencatatan yang digunakan adalah pencatatan sederhana",

    declaration:
      "Dengan menyadari sepenuhnya segala akibatnya, termasuk sanksi sesuai ketentuan perundang-undangan yang berlaku, saya menyatakan bahwa apa yang saya beritahukan di atas beserta lampirannya adalah benar, lengkap, dan jelas.",
    signer: "Penandatangan",
    signerSelf: "Wajib pajak",
    signerProxy: "Kuasa wajib pajak",
    fullName: "Nama lengkap",

    assetSummary: "Ikhtisar harta",
    assetTotal: "Jumlah harta pada akhir tahun pajak",
    assetAcquisition: "Harga perolehan",
    assetCurrent: "Nilai saat ini",
    description: "Uraian",
    totalDebts: "Jumlah utang",
    totalEmployment: "Jumlah penghasilan neto, masuk ke baris 1.a",
    totalWithholding: "Jumlah PPh dipotong atau dipungut",
  },

  hint: {
    q1a: {
      yes: "Isi rinciannya di Lampiran I bagian D.",
      no: "Lanjutkan ke pertanyaan berikutnya.",
    },
    q1b: {
      yes: "Isikan penghasilan neto usaha atau pekerjaan bebas.",
      no: "Lanjutkan ke pertanyaan berikutnya.",
    },
    q1c: {
      yes: "Isikan penghasilan neto dalam negeri lainnya.",
      no: "Lanjutkan ke pertanyaan berikutnya.",
    },
    q1d: {
      yes: "Isikan penghasilan neto dari luar negeri.",
      no: "Lanjutkan ke pertanyaan berikutnya.",
    },
    q3: {
      yes: "Isikan jumlah pengurang penghasilan neto.",
      no: "Tidak ada pengurang yang diperhitungkan.",
    },
    q8: {
      yes: "Isikan pengurang PPh terutang.",
      no: "Tidak ada pengurang yang diperhitungkan.",
    },
    q10a: {
      yes: "Isikan jumlah PPh yang dipotong atau dipungut pihak lain.",
      no: "Tidak ada pemotongan oleh pihak lain.",
    },
    q10d: {
      yes: "Isikan jumlah pengembalian atau pengurangan.",
      no: "Tidak ada pengembalian yang diterima.",
    },
    q11b: {
      yes: "Isikan nilai sesuai surat keputusan.",
      no: "Saya tidak memiliki surat keputusan tersebut.",
    },
    q13a: { yes: "Lanjutkan ke pertanyaan berikutnya.", no: "Lanjutkan ke pertanyaan berikutnya." },
    q13b: { yes: "Lanjutkan ke pertanyaan berikutnya.", no: "Lanjutkan ke pertanyaan berikutnya." },
    q13c: {
      yes: "Lanjutkan ke pertanyaan berikutnya.",
      no: "Tidak ada kewajiban membayar angsuran PPh Pasal 25.",
    },
    generic: {
      yes: "Lanjutkan ke pertanyaan berikutnya.",
      no: "Lanjutkan ke pertanyaan berikutnya.",
    },
  },
};

const en: SptDict = {
  pageTitle: "Individual annual income tax return",
  breadcrumbReturns: "My returns",
  tabInduk: "Main form",
  tabL1: "Schedule I",
  guideTitle: "Filling guide",
  guideIntro:
    "The guidance in this panel follows whichever section you are filling in.",

  back: "Back",
  saveDraft: "Save draft",
  saving: "Saving...",
  unsavedMark: "Unsaved changes",
  submit: "Pay and file",
  submitting: "Filing...",
  amountDue: "Amount payable",

  msgSaved: "Draft saved.",
  msgDeclarationRequired:
    "Tick the declaration in part K before filing the return.",
  msgSubmitted: "Return submitted and awaiting officer review.",
  msgRejected:
    "An officer rejected this return. Correct the entries and file it again.",
  msgAgentPtkp: (code) =>
    `Allowance status ${code} saved with assistant help.`,
  msgAgentIncome:
    "Income and tax credits saved with assistant help. Tax recalculated.",
  msgAgentAssets: (count) =>
    `${count} asset row${count === 1 ? "" : "s"} saved with assistant help.`,
  msgAgentFamily: (count) =>
    `${count} family member${count === 1 ? "" : "s"} saved with assistant help.`,
  msgAgentDebts: (count) =>
    `${count} debt row${count === 1 ? "" : "s"} saved with assistant help.`,
  msgAgentWithholding: (count) =>
    `${count} withholding slip${count === 1 ? "" : "s"} saved with assistant help. Tax credit updated.`,
  msgAgentAnswers: (count) =>
    `${count} question answer${count === 1 ? "" : "s"} saved with assistant help.`,

  yes: "Yes",
  no: "No",
  choose: "Please choose",
  none: "None",
  addRow: "Add row",
  clearRows: "Clear table",
  removeRow: "Remove row",
  noRows: "No entries in this table yet.",
  rowNumber: "No.",
  action: "Action",
  total: "Total",
  unconfirmed: "Not confirmed",
  unconfirmedHint: "Marital status and dependant count are not yet confirmed.",
  filingStatus: "Filing status",

  section: {
    header: "Filing details",
    identity: "A. Taxpayer identity",
    income: "B. Net income summary",
    tax: "C. Tax calculation",
    credits: "D. Tax credits",
    balance: "E. Tax under or overpaid",
    amendment: "F. Amendment",
    refund: "G. Refund request",
    installment: "H. Next year's monthly instalments",
    other: "I. Other declarations",
    attachments: "J. Additional attachments",
    declaration: "K. Declaration",
    assets: "A. Assets at year end",
    debts: "B. Debts at year end",
    family: "C. Dependent family members",
    employment: "D. Domestic net income from employment",
    withholding: "E. Withholding slips received",
  },

  guide: {
    header: {
      title: "Start here",
      body: "This part sets the tax year you are reporting and how you record your income.",
      points: [
        "Normal for your first filing this year.",
        "Amendment if you are correcting a return already filed.",
        "Simple records for employees; bookkeeping for a business.",
      ],
    },
    identity: {
      title: "Your details are already filled in",
      body: "Identity comes from your account and cannot be edited here. Correct it through your taxpayer profile.",
    },
    income: {
      title: "Gather a year of income",
      body: "Answer Yes only where you genuinely received that kind of income.",
      points: [
        "Employment income is entered in Schedule I part D.",
        "Every figure asked for is net income, not gross.",
        "Answering No resets that amount to zero.",
      ],
    },
    tax: {
      title: "How the tax is worked out",
      body: "Net income less your personal allowance gives taxable income, and progressive rates apply to that.",
      points: [
        "The allowance depends on marital status and dependants.",
        "Taxable income is rounded down to the nearest thousand.",
        "Rates step from 5% up to 35%.",
      ],
    },
    credits: {
      title: "Tax you have already paid",
      body: "Credits reduce the tax you owe. Enter them from the slips and payment receipts you hold.",
      points: [
        "Tax withheld by others appears on form 1721-A1.",
        "Article 25 instalments are your own monthly payments.",
      ],
    },
    balance: {
      title: "Underpaid or overpaid",
      body: "The gap between tax owed and tax credits decides whether you still owe or are due a refund.",
    },
    amendment: {
      title: "Only for amendments",
      body: "Skip this part unless you set the filing status at the top of the form to Amendment.",
    },
    refund: {
      title: "If your return is overpaid",
      body: "This part matters only when the calculation shows an overpayment. The account must be in your own name.",
    },
    installment: {
      title: "Next year's instalments",
      body: "This decides whether you must pay monthly Article 25 instalments during the following tax year.",
    },
    other: {
      title: "Closing declarations",
      body: "These questions complete the picture of your finances beyond income and its tax.",
      points: [
        "The asset figure is carried in from Schedule I part A.",
        "Answer honestly; no amounts are needed on this page.",
      ],
    },
    attachments: {
      title: "Supporting documents",
      body: "Nothing needs uploading in this prototype. The list is shown so the scope of the form stays visible.",
    },
    declaration: {
      title: "The last step",
      body: "Tick the declaration to confirm your entries are true, complete and clear. The return cannot be filed without it.",
    },
    assets: {
      title: "Assets at year end",
      body: "Record what you held on 31 December of the tax year, grouped by kind.",
      points: [
        "Acquisition price is what you paid when you acquired it.",
        "Leave tables that do not apply to you empty.",
      ],
    },
    debts: {
      title: "Debts at year end",
      body: "List the outstanding principal on debts still running at the end of the tax year.",
    },
    family: {
      title: "Dependants set your allowance",
      body: "At most three dependants count. Each one raises your personal allowance.",
    },
    employment: {
      title: "Copy from your withholding slip",
      body: "One row per employer. Net income is worked out for you from gross less deductions.",
      points: [
        "The net column total feeds part B line 1.a.",
        "Use the figures printed on form 1721-A1.",
      ],
    },
    withholding: {
      title: "Slips issued to you",
      body: "This list supports the tax credits you claim in part D of the main form.",
    },
  },

  row: {
    taxYear: "Tax year",
    status: "Filing status",
    method: "Recording method",
    period: "Accounting period",
    source: "Income source",
    npwp: "NIK or NPWP",
    name: "Name",
    idType: "Identity type",
    idNumber: "Identity number",
    phone: "Phone number",
    email: "Email address",
    spouseStatus: "Spousal tax obligation status",
    spouseNpwp: "Spouse's NIK or NPWP",

    q1a: "Did you receive domestic income from employment?",
    q1b: "Did you receive domestic income from a business or independent work?",
    q1c: "Did you receive any other domestic income?",
    q1d: "Did you receive income from abroad?",

    r2: "Net income for the year",
    q3: "Are there deductions from net income, such as loss carry-forward or zakat?",
    r4: "Net income after deductions",
    r5: "Personal allowance",
    r6: "Taxable income",
    r7: "Tax owed",
    q8: "Are there any reductions to the tax owed?",
    r9: "Tax owed after reductions",

    q10a: "Was tax withheld or collected by another party?",
    r10b: "Article 25 monthly instalments",
    r10c: "Article 25 assessment notice, principal only",
    q10d: "Did you receive a refund of foreign tax credits already claimed?",

    r11a: "Tax under or overpaid",
    q11b: "Is there a decision letter granting instalments or deferred payment?",
    r11c: "Tax still payable",

    r12a: "Tax under or overpaid on the return being amended",
    r12b: "Tax under or overpaid due to the amendment",

    refundRequest: "The overpaid tax should be",
    accountNumber: "Account number",
    bankName: "Bank name",
    accountHolder: "Account holder name",

    q13a: "Do you receive regular income and owe Article 25 instalments next year?",
    q13b: "Have you prepared your own calculation of next year's Article 25 instalments?",
    q13c: "Will you pay Article 25 instalments as a certain-turnover taxpayer next year?",

    r14a: "Assets at the end of the tax year",
    q14b: "Did you hold any debts at the end of the tax year?",
    q14c: "Did you receive income subject to final income tax?",
    q14d: "Did you receive income that is not an object of tax?",
    q14e: "Did you report fiscal depreciation or amortisation?",
    q14f: "Did you report entertainment, promotion, benefit-in-kind or bad debt costs?",
    q14g: "Did you receive foreign dividends or other income as a non-taxable object?",
    r14h: "Refundable excess final tax on certain gross turnover",

    attachA: "Financial statements",
    attachB: "Proof of zakat or religious contribution payment",
    attachC: "Withholding slips for foreign tax credits",
    attachD: "Special power of attorney",
    attachE: "Other documents",
    attachNone: "No document needs to be attached",
    attachSimple: "No, the recording method used is simple record keeping",

    declaration:
      "Fully aware of the consequences, including the penalties set out in the applicable legislation, I declare that what I have reported above and in its schedules is true, complete and clear.",
    signer: "Signed by",
    signerSelf: "The taxpayer",
    signerProxy: "An authorised representative",
    fullName: "Full name",

    assetSummary: "Asset summary",
    assetTotal: "Total assets at the end of the tax year",
    assetAcquisition: "Acquisition price",
    assetCurrent: "Current value",
    description: "Description",
    totalDebts: "Total debts",
    totalEmployment: "Total net income, carried to line 1.a",
    totalWithholding: "Total tax withheld or collected",
  },

  hint: {
    q1a: {
      yes: "Enter the detail in Schedule I part D.",
      no: "Continue to the next question.",
    },
    q1b: {
      yes: "Enter your net business or independent-work income.",
      no: "Continue to the next question.",
    },
    q1c: {
      yes: "Enter your other net domestic income.",
      no: "Continue to the next question.",
    },
    q1d: {
      yes: "Enter your net income from abroad.",
      no: "Continue to the next question.",
    },
    q3: {
      yes: "Enter the amount deducted from net income.",
      no: "No deduction is taken into account.",
    },
    q8: {
      yes: "Enter the reduction to the tax owed.",
      no: "No reduction is taken into account.",
    },
    q10a: {
      yes: "Enter the tax withheld or collected by others.",
      no: "Nothing was withheld by another party.",
    },
    q10d: {
      yes: "Enter the amount refunded or reduced.",
      no: "No refund was received.",
    },
    q11b: {
      yes: "Enter the amount stated in the decision letter.",
      no: "I do not hold such a decision letter.",
    },
    q13a: { yes: "Continue to the next question.", no: "Continue to the next question." },
    q13b: { yes: "Continue to the next question.", no: "Continue to the next question." },
    q13c: {
      yes: "Continue to the next question.",
      no: "There is no obligation to pay Article 25 instalments.",
    },
    generic: {
      yes: "Continue to the next question.",
      no: "Continue to the next question.",
    },
  },
};

export const sptText: Record<Lang, SptDict> = { id, en };
export type SptDictionary = SptDict;

/**
 * English for the statutory terms that live in `spt.ts` as data — L-1 column
 * headings, asset category names, and the short dropdown vocabularies.
 *
 * Keeping the translation here rather than adding an `labelEn` to every
 * `TableCol` leaves `spt.ts` as the single source of the Indonesian form and
 * makes the English a pure lookup layer over it. Anything absent falls back
 * to the Indonesian, which is correct for the DJP asset and debt codes
 * ("011 - Uang tunai"): those are published identifiers, not UI copy.
 */
const TERMS_EN: Record<string, string> = {
  /* L-1 column headings */
  "Alamat Harta": "Asset address",
  "Atas Nama": "In the name of",
  "Dasar Pengenaan Pajak": "Tax base",
  Deskripsi: "Description",
  "Harga Perolehan": "Acquisition price",
  "Hubungan dengan Wajib Pajak": "Relationship to taxpayer",
  "Jenis Pajak": "Tax type",
  Keterangan: "Ownership note",
  Kode: "Code",
  "Lokasi Harta": "Asset location",
  "Lokasi Penerima Pinjaman": "Borrower location",
  NIK: "NIK",
  "NIK/NPWP Penerima Pinjaman": "Borrower NIK or NPWP",
  "NPWP Bank/Institusi/Penerima Investasi": "Institution NPWP",
  "NPWP Pemotong/Pemungut": "Withholder NPWP",
  "NPWP/NIK Pemberi Kerja": "Employer NPWP or NIK",
  "Nama Bank/Institusi": "Bank or institution",
  "Nama Bank/Institusi/Penerima Investasi": "Bank, institution or investee",
  "Nama Pemberi Kerja": "Employer name",
  "Nama Pemotong/Pemungut": "Withholder name",
  "Nama Penerima Pinjaman": "Borrower name",
  Nama: "Name",
  "Negara Kreditur": "Creditor country",
  "Nilai Piutang": "Receivable value",
  "Nilai Saat Ini": "Current value",
  "Nomor Akun": "Account number",
  "Nomor Bukti Kepemilikan": "Ownership document number",
  "Nomor Bukti Potong": "Withholding slip number",
  "Nomor Identitas WP": "Taxpayer identity number",
  "PPh Dipotong/Dipungut": "Tax withheld or collected",
  Pekerjaan: "Occupation",
  "Penghasilan Bruto": "Gross income",
  "Penghasilan Neto": "Net income",
  Pengurangan: "Deductions",
  "Saldo Piutang Saat Ini": "Current receivable balance",
  Saldo: "Balance",
  "Tahun Dimulai": "Year started",
  "Tahun Peminjaman": "Year borrowed",
  "Tahun Perolehan": "Year acquired",
  "Tanggal Bukti Potong": "Slip date",
  "Tanggal Lahir": "Date of birth",

  /* asset categories (L-1 part A sub-tables) */
  "Kas dan Setara Kas": "Cash and cash equivalents",
  Piutang: "Receivables",
  "Investasi/Sekuritas": "Investments and securities",
  "Harta Bergerak": "Movable assets",
  "Harta Tidak Bergerak (Termasuk Tanah Bangunan)":
    "Immovable assets, including land and buildings",
  "Harta Lainnya": "Other assets",

  /* header dropdowns */
  Normal: "Normal",
  Pembetulan: "Amendment",
  Pencatatan: "Simple records",
  Pembukuan: "Bookkeeping",
  "Pekerjaan Bebas": "Independent work",
  Usaha: "Business",
  Lainnya: "Other",

  /* ownership notes */
  "Milik Sendiri": "Owned outright",
  "Harta Bersama": "Jointly owned",
  "Warisan Belum Terbagi": "Undistributed inheritance",
  "Atas Nama Pihak Lain": "Held in another party's name",

  /* asset location */
  "Dalam Negeri": "Domestic",
  "Luar Negeri": "Foreign",

  /* payment status, as computed by the backend */
  Nihil: "Nil",
  "Kurang Bayar": "Underpaid",
  "Lebih Bayar": "Overpaid",
};

/**
 * Translate one statutory term. Indonesian passes through unchanged; English
 * falls back to the Indonesian when no translation is registered.
 */
export function term(lang: Lang, value: string): string {
  if (lang === "id") return value;
  return TERMS_EN[value] ?? value;
}
