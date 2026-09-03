export type Lang = "id" | "en";

/**
 * Indonesian is the primary language, English the secondary. Both dictionaries
 * must define the same keys — `Dict` is derived from the Indonesian one, so a
 * missing English key is a type error.
 *
 * Indonesian strings run roughly 10-15% longer than their English
 * counterparts; every label here is checked against the layout in both
 * languages. Wrapping is fine, truncation is a bug.
 */
export const translations = {
  id: {
    /* ---------- global chrome ---------- */
    disclaimer:
      "Prototipe edukasi hackathon menggunakan data sintetis. Tidak berafiliasi dengan DJP.",
    brandSub: "Lapor pajak tanpa drama",
    footer:
      "EasyTax — prototipe edukasi. Seluruh angka dan identitas adalah data sintetis.",

    navMyReturns: "SPT Saya",
    navReview: "Peninjauan SPT",
    signOut: "Keluar",
    signingOut: "Keluar...",
    taxOfficer: "Petugas Pajak",

    /* ---------- landing ---------- */
    heroBadge: "SPT Tahunan · Tahun Pajak 2025",
    heroHeadline: "Lapor SPT Tahunan tanpa rasa cemas",
    heroSubtitle:
      "EasyTax memandu Anda mengisi SPT Tahunan PPh Orang Pribadi langkah demi langkah. Setiap bagian disertai penjelasan singkat, sehingga Anda tahu persis apa yang sedang diisi.",
    cta: "Masuk untuk mulai",
    ctaSecondary: "Daftar akun baru",
    ctaNote: "Prototipe ini memakai data sintetis, bukan data pajak asli.",
    safeTitle: "Yang membuat ini mudah",
    safeDesc: "Tiga hal yang membedakan EasyTax dari formulir biasa.",
    safe1Title: "Panduan di samping setiap bagian",
    safe1Desc: "Penjelasan muncul mengikuti bagian yang sedang Anda isi.",
    safe2Title: "Hitungan berjalan otomatis",
    safe2Desc: "PTKP, PKP, dan PPh terutang dihitung saat Anda mengetik.",
    safe3Title: "Dua bahasa, satu tampilan",
    safe3Desc: "Beralih antara Indonesia dan Inggris kapan saja.",
    dangerTitle: "Yang tetap perlu Anda siapkan",
    dangerDesc: "Dokumen yang sebaiknya ada di tangan sebelum mulai.",
    danger1Title: "Bukti potong 1721-A1",
    danger1Desc: "Dari pemberi kerja, untuk penghasilan dari pekerjaan.",
    danger2Title: "Daftar harta dan utang",
    danger2Desc: "Posisi pada akhir tahun pajak yang dilaporkan.",
    danger3Title: "Data tanggungan keluarga",
    danger3Desc: "Menentukan status PTKP dan besar penghasilan tidak kena pajak.",

    /* ---------- auth ---------- */
    descTitle: "Lapor pajak tanpa drama",
    descTagline: "Satu formulir, dipandu dari awal sampai selesai",
    descSubtitle:
      "Masuk untuk melanjutkan SPT Tahunan PPh Orang Pribadi Anda.",
    loginWelcome: "Selamat datang kembali",
    loginSubtitle: "Masuk untuk melanjutkan pelaporan SPT Anda.",
    useridLabel: "ID pengguna",
    useridPlaceholder: "NIK atau NPWP",
    useridHelper: "Gunakan NIK 16 digit atau NPWP 15 digit, tanpa tanda baca.",
    passwordLabel: "Kata sandi",
    passwordPlaceholder: "Masukkan kata sandi",
    captchaLabel: "Verifikasi",
    captchaCheckbox: "Saya bukan robot",
    capsWarning: "Caps Lock sedang aktif",
    forgot: "Lupa kata sandi?",
    showPassword: "Tampilkan kata sandi",
    hidePassword: "Sembunyikan kata sandi",
    loginButton: "Masuk",
    loginLoading: "Memproses...",
    separator: "atau",
    newUserTitle: "Pengguna baru?",
    newUserDesc: "Daftar di sini",
    activationTitle: "Belum aktivasi?",
    activationDesc: "Aktivasi akun wajib pajak",
    errUseridRequired: "ID pengguna wajib diisi",
    errPasswordRequired: "Kata sandi wajib diisi",
    errCaptchaRequired: "Verifikasi wajib dilakukan",
    errLoginFailed: "ID pengguna atau kata sandi salah.",
    errNetwork: "Tidak dapat terhubung ke server. Coba lagi.",
    backHome: "Kembali ke beranda",

    registerWelcome: "Buat akun baru",
    registerSubtitle:
      "Lengkapi data berikut untuk membuat akun wajib pajak EasyTax.",
    fullNameLabel: "Nama lengkap",
    fullNamePlaceholder: "Sesuai kartu identitas",
    emailLabel: "Alamat email",
    emailPlaceholder: "nama@contoh.co.id",
    npwpLabel: "NPWP",
    npwpOptional: "opsional",
    npwpPlaceholder: "09.123.456.7-890.000",
    confirmPasswordLabel: "Konfirmasi kata sandi",
    confirmPasswordPlaceholder: "Ulangi kata sandi",
    passwordHint:
      "Minimal 8 karakter, memuat huruf besar, huruf kecil, dan angka.",
    useridHint: "NIK 16 digit atau NPWP 15 digit, tanpa tanda baca.",
    registerButton: "Daftar",
    registerLoading: "Mendaftarkan...",
    haveAccountTitle: "Sudah punya akun?",
    haveAccountDesc: "Masuk di sini",
    errFullNameRequired: "Nama lengkap wajib diisi",
    errEmailRequired: "Alamat email wajib diisi",
    errEmailInvalid: "Alamat email tidak valid",
    errUseridFormat: "Masukkan NIK 16 digit atau NPWP 15 digit",
    errPasswordWeak:
      "Kata sandi minimal 8 karakter dan memuat huruf besar, huruf kecil, serta angka",
    errConfirmMismatch: "Konfirmasi kata sandi tidak sama",
    registerFailed: "Pendaftaran gagal. Periksa kembali data Anda.",
    backLogin: "Kembali ke halaman masuk",

    /* ---------- main menu ---------- */
    menuGreeting: "Halo",
    menuHeadline: "Layanan perpajakan Anda",
    menuSubtitle:
      "Pilih layanan untuk memulai. Pada prototipe ini hanya SPT Tahunan Orang Pribadi yang aktif.",
    serviceAnnualTitle: "SPT Tahunan Orang Pribadi",
    serviceAnnualDesc:
      "Isi dan laporkan SPT Tahunan PPh Orang Pribadi untuk tahun pajak berjalan.",
    serviceAnnualAction: "Buka layanan",
    servicePeriodicTitle: "SPT Masa PPN",
    servicePeriodicDesc: "Pelaporan bulanan Pajak Pertambahan Nilai.",
    serviceBillingTitle: "Pembuatan kode billing",
    serviceBillingDesc: "Buat kode billing untuk pembayaran pajak.",
    serviceWithholdingTitle: "Bukti potong elektronik",
    serviceWithholdingDesc: "Kelola bukti potong PPh yang Anda terima.",
    serviceProfileTitle: "Profil wajib pajak",
    serviceProfileDesc: "Perbarui data identitas dan alamat terdaftar.",
    serviceSoon: "Belum tersedia",

    /* ---------- return list ---------- */
    returnsTitle: "SPT Tahunan saya",
    returnsSubtitle:
      "Semua konsep dan laporan Anda, terbaru lebih dulu.",
    createReturn: "Buat SPT",
    tabAll: "Semua",
    emptyAll: "Belum ada SPT. Mulai dengan tombol “Buat SPT”.",
    emptyFiltered: "Tidak ada SPT pada status ini.",
    taxYear: "Tahun pajak",
    updatedAt: "Diperbarui",
    submittedAt: "Dikirim",
    rejectedLabel: "Alasan penolakan",
    fillReturn: "Isi SPT",
    viewReturn: "Lihat",
    deleteDraft: "Hapus",
    confirmDelete: "Hapus konsep SPT ini? Tindakan ini tidak dapat dibatalkan.",
    errDelete: "Gagal menghapus konsep.",
    errGeneric: "Terjadi kesalahan.",

    createModalTitle: "Buat SPT Tahunan",
    createModalSubtitle: "Pilih tahun pajak dan jenis formulir.",
    taxYearLabel: "Tahun pajak",
    formTypeLabel: "Jenis formulir",
    cancel: "Batal",
    createAndFill: "Buat dan isi",
    creating: "Membuat...",

    /* ---------- statuses ---------- */
    statusDraft: "Konsep",
    statusWaiting: "Menunggu pembayaran",
    statusReported: "Dilaporkan",
    statusRejected: "Ditolak",

    /* ---------- admin ---------- */
    adminBadge: "Panel petugas pajak",
    adminTitle: "Peninjauan SPT Tahunan",
    adminSubtitle:
      "Tinjau SPT yang dikirim wajib pajak, lalu setujui sebagai dilaporkan atau tolak dengan alasan.",
    adminTaxpayer: "Wajib pajak",
    viewDetail: "Lihat detail",
    approve: "Setujui",
    reject: "Tolak",
    processing: "Memproses...",
    rejectModalTitle: "Tolak SPT",
    rejectReasonLabel: "Alasan penolakan",
    rejectReasonPlaceholder:
      "Contoh: penghasilan neto tidak sesuai bukti potong 1721-A1.",
    rejectReasonHelper:
      "Alasan ini tampil pada SPT wajib pajak agar dapat diperbaiki.",
    errApprove: "Gagal menyetujui SPT.",
    errReject: "Gagal menolak SPT.",
    netIncome: "Penghasilan neto",
    taxableIncomeShort: "PKP",
    taxOwedShort: "PPh terutang",
    taxCreditShort: "Kredit pajak",
  },

  en: {
    /* ---------- global chrome ---------- */
    disclaimer:
      "Educational hackathon prototype using synthetic data. Not affiliated with DJP.",
    brandSub: "Tax filing without the dread",
    footer:
      "EasyTax — educational prototype. Every figure and identity here is synthetic data.",

    navMyReturns: "My returns",
    navReview: "Return review",
    signOut: "Sign out",
    signingOut: "Signing out...",
    taxOfficer: "Tax officer",

    /* ---------- landing ---------- */
    heroBadge: "Annual return · Tax year 2025",
    heroHeadline: "File your annual return without the dread",
    heroSubtitle:
      "EasyTax walks you through the individual annual income tax return one section at a time. Each part comes with a short explanation, so you always know what you are filling in.",
    cta: "Sign in to start",
    ctaSecondary: "Create an account",
    ctaNote: "This prototype uses synthetic data, not real tax records.",
    safeTitle: "What makes this easy",
    safeDesc: "Three things that set EasyTax apart from an ordinary form.",
    safe1Title: "Guidance beside every section",
    safe1Desc: "The explanation follows whichever section you are filling in.",
    safe2Title: "Figures add up as you type",
    safe2Desc: "Allowance, taxable income and tax owed update live.",
    safe3Title: "Two languages, one layout",
    safe3Desc: "Switch between Indonesian and English at any time.",
    dangerTitle: "What to have ready",
    dangerDesc: "Documents worth keeping at hand before you begin.",
    danger1Title: "Form 1721-A1 withholding slip",
    danger1Desc: "From your employer, covering employment income.",
    danger2Title: "List of assets and debts",
    danger2Desc: "Their position at the end of the tax year you report.",
    danger3Title: "Dependant details",
    danger3Desc: "These set your allowance status and non-taxable income.",

    /* ---------- auth ---------- */
    descTitle: "Tax filing without the dread",
    descTagline: "One form, guided from start to finish",
    descSubtitle:
      "Sign in to continue your individual annual income tax return.",
    loginWelcome: "Welcome back",
    loginSubtitle: "Sign in to continue filing your annual return.",
    useridLabel: "User ID",
    useridPlaceholder: "NIK or NPWP",
    useridHelper: "Use your 16-digit NIK or 15-digit NPWP, digits only.",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    captchaLabel: "Verification",
    captchaCheckbox: "I am not a robot",
    capsWarning: "Caps Lock is on",
    forgot: "Forgot your password?",
    showPassword: "Show password",
    hidePassword: "Hide password",
    loginButton: "Sign in",
    loginLoading: "Signing in...",
    separator: "or",
    newUserTitle: "New here?",
    newUserDesc: "Create an account",
    activationTitle: "Not activated?",
    activationDesc: "Activate your taxpayer account",
    errUseridRequired: "User ID is required",
    errPasswordRequired: "Password is required",
    errCaptchaRequired: "Verification is required",
    errLoginFailed: "That user ID or password is not correct.",
    errNetwork: "Could not reach the server. Please try again.",
    backHome: "Back to home",

    registerWelcome: "Create an account",
    registerSubtitle:
      "Fill in the details below to create your EasyTax taxpayer account.",
    fullNameLabel: "Full name",
    fullNamePlaceholder: "As shown on your ID card",
    emailLabel: "Email address",
    emailPlaceholder: "name@example.com",
    npwpLabel: "Tax number (NPWP)",
    npwpOptional: "optional",
    npwpPlaceholder: "09.123.456.7-890.000",
    confirmPasswordLabel: "Confirm password",
    confirmPasswordPlaceholder: "Re-enter your password",
    passwordHint:
      "At least 8 characters, with an upper-case letter, a lower-case letter and a digit.",
    useridHint: "16-digit NIK or 15-digit NPWP, digits only.",
    registerButton: "Create account",
    registerLoading: "Creating account...",
    haveAccountTitle: "Already registered?",
    haveAccountDesc: "Sign in here",
    errFullNameRequired: "Full name is required",
    errEmailRequired: "Email address is required",
    errEmailInvalid: "That email address is not valid",
    errUseridFormat: "Enter a 16-digit NIK or a 15-digit NPWP",
    errPasswordWeak:
      "Password must be at least 8 characters and include upper case, lower case and a digit",
    errConfirmMismatch: "The two passwords do not match",
    registerFailed: "Registration failed. Please review your details.",
    backLogin: "Back to sign in",

    /* ---------- main menu ---------- */
    menuGreeting: "Hello",
    menuHeadline: "Your tax services",
    menuSubtitle:
      "Pick a service to begin. In this prototype only the individual annual return is active.",
    serviceAnnualTitle: "Individual annual return",
    serviceAnnualDesc:
      "Fill in and file your individual annual income tax return for the current tax year.",
    serviceAnnualAction: "Open service",
    servicePeriodicTitle: "Monthly VAT return",
    servicePeriodicDesc: "Monthly value added tax reporting.",
    serviceBillingTitle: "Billing code",
    serviceBillingDesc: "Generate a billing code to pay your tax.",
    serviceWithholdingTitle: "Electronic withholding slips",
    serviceWithholdingDesc: "Manage the withholding slips issued to you.",
    serviceProfileTitle: "Taxpayer profile",
    serviceProfileDesc: "Update your registered identity and address.",
    serviceSoon: "Not yet available",

    /* ---------- return list ---------- */
    returnsTitle: "My annual returns",
    returnsSubtitle: "Every draft and filing you have, newest first.",
    createReturn: "New return",
    tabAll: "All",
    emptyAll: "No returns yet. Start with the “New return” button.",
    emptyFiltered: "No returns with this status.",
    taxYear: "Tax year",
    updatedAt: "Updated",
    submittedAt: "Submitted",
    rejectedLabel: "Reason for rejection",
    fillReturn: "Continue filing",
    viewReturn: "View",
    deleteDraft: "Delete",
    confirmDelete: "Delete this draft return? This cannot be undone.",
    errDelete: "Could not delete the draft.",
    errGeneric: "Something went wrong.",

    createModalTitle: "New annual return",
    createModalSubtitle: "Choose the tax year and the form type.",
    taxYearLabel: "Tax year",
    formTypeLabel: "Form type",
    cancel: "Cancel",
    createAndFill: "Create and fill",
    creating: "Creating...",

    /* ---------- statuses ---------- */
    statusDraft: "Draft",
    statusWaiting: "Awaiting payment",
    statusReported: "Filed",
    statusRejected: "Rejected",

    /* ---------- admin ---------- */
    adminBadge: "Tax officer panel",
    adminTitle: "Annual return review",
    adminSubtitle:
      "Review the returns taxpayers have submitted, then approve them as filed or reject them with a reason.",
    adminTaxpayer: "Taxpayer",
    viewDetail: "View detail",
    approve: "Approve",
    reject: "Reject",
    processing: "Working...",
    rejectModalTitle: "Reject return",
    rejectReasonLabel: "Reason for rejection",
    rejectReasonPlaceholder:
      "For example: net income does not match the 1721-A1 withholding slip.",
    rejectReasonHelper:
      "The taxpayer sees this reason on their return so they can correct it.",
    errApprove: "Could not approve the return.",
    errReject: "Could not reject the return.",
    netIncome: "Net income",
    taxableIncomeShort: "Taxable income",
    taxOwedShort: "Tax owed",
    taxCreditShort: "Tax credit",
  },
} as const;

/** Union of both dictionaries — what `translations[lang]` resolves to. */
export type Dict = (typeof translations)[Lang];
