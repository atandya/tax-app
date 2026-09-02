-- Demo SPT for the taxpayer account (0912345678901234), pre-filled so the
-- Lampiran L-1 tab has a row in every table: A.1–A.6 harta, B utang,
-- C tanggungan, D penghasilan neto, E bukti potong.
--
-- Totals below match the server-side computation (tax.ts):
--   neto 174.000.000 − PTKP K/1 63.000.000 = PKP 111.000.000
--   PPh 10.650.000 − kredit 9.000.000      = kurang bayar 1.650.000
INSERT INTO spt_returns (
    user_id, tax_year, form_type, status, data,
    pph_owed, pph_credit, balance_due, payment_status
)
SELECT
    u.id, 2025, '1770 S', 'DRAFT',
    $json$
{
  "identity": { "ptkp": "K/1", "signer": "wp" },
  "header": {
    "status": "Normal",
    "method": "Pencatatan",
    "periodStart": 1,
    "periodEnd": 12,
    "source": "Pekerjaan"
  },
  "income": { "employment": 174000000, "business": 0, "other": 0, "foreign": 0 },
  "deductions": { "zakat": 0 },
  "credits": { "withholding": 9000000, "installment25": 0, "stp25": 0 },
  "answers": {
    "q1a": "ya", "q1b": "tidak", "q1c": "tidak", "q1d": "tidak",
    "q3": "tidak", "q8": "tidak", "q10a": "tidak", "q10d": "tidak",
    "q11b": "tidak", "q13a": "tidak", "q13b": "tidak", "q13c": "tidak",
    "q14b": "ya", "q14c": "tidak", "q14d": "tidak", "q14e": "tidak",
    "q14f": "tidak", "q14g": "tidak"
  },
  "assets": [
    {
      "category": "Kas dan Setara Kas",
      "code": "011",
      "description": "011 - Uang tunai",
      "accountNo": "",
      "holderName": "Budi Santoso",
      "institutionName": "",
      "location": "Dalam Negeri",
      "year": 2025,
      "balance": 5000000,
      "note": "Milik Sendiri"
    },
    {
      "category": "Kas dan Setara Kas",
      "code": "012",
      "description": "012 - Tabungan",
      "accountNo": "1234567890",
      "holderName": "Budi Santoso",
      "institutionName": "Bank Mandiri",
      "location": "Dalam Negeri",
      "year": 2019,
      "balance": 85000000,
      "note": "Milik Sendiri"
    },
    {
      "category": "Piutang",
      "code": "021",
      "description": "021 - Piutang",
      "borrowerLocation": "Dalam Negeri",
      "borrowerId": "3271091902010011",
      "borrowerName": "Andi Wijaya",
      "year": 2023,
      "receivableValue": 20000000,
      "receivableBalance": 12000000,
      "note": "Milik Sendiri"
    },
    {
      "category": "Investasi/Sekuritas",
      "code": "036",
      "description": "036 - Reksadana",
      "location": "Dalam Negeri",
      "institutionNpwp": "01.111.222.3-045.000",
      "institutionName": "PT Manulife Aset Manajemen Indonesia",
      "accountNo": "RD-88213",
      "year": 2021,
      "acquisitionPrice": 30000000,
      "value": 41500000,
      "note": "Milik Sendiri"
    },
    {
      "category": "Harta Bergerak",
      "code": "041",
      "description": "041 - Alat transportasi",
      "location": "Dalam Negeri",
      "ownershipProofNo": "B 1234 XYZ",
      "year": 2020,
      "acquisitionPrice": 210000000,
      "value": 165000000,
      "note": "Milik Sendiri"
    },
    {
      "category": "Harta Tidak Bergerak (Termasuk Tanah Bangunan)",
      "code": "061",
      "description": "061 - Tanah dan/atau bangunan untuk tempat tinggal",
      "address": "Jl. Melati No. 12, Bekasi Selatan",
      "location": "Dalam Negeri",
      "ownershipProofNo": "SHM 01234",
      "year": 2018,
      "acquisitionPrice": 650000000,
      "value": 900000000,
      "note": "Harta Bersama"
    },
    {
      "category": "Harta Lainnya",
      "code": "099",
      "description": "099 - Harta lainnya",
      "location": "Dalam Negeri",
      "year": 2022,
      "acquisitionPrice": 15000000,
      "value": 15000000,
      "note": "Milik Sendiri"
    }
  ],
  "debts": [
    {
      "code": "101 - Utang bank / lembaga keuangan bukan bank",
      "description": "KPR rumah tinggal",
      "creditorId": "01.234.567.8-901.000",
      "creditorName": "Bank BTN",
      "country": "Indonesia",
      "year": 2018,
      "balance": 320000000,
      "note": "Milik Sendiri"
    },
    {
      "code": "102 - Kartu kredit",
      "description": "Kartu kredit Bank Mandiri",
      "creditorId": "01.999.888.7-054.000",
      "creditorName": "Bank Mandiri",
      "country": "Indonesia",
      "year": 2024,
      "balance": 8500000,
      "note": "Milik Sendiri"
    }
  ],
  "family": [
    {
      "name": "Siti Rahma Santoso",
      "nik": "3275014204150002",
      "birthDate": "2015-04-12",
      "relation": "Anak Kandung",
      "job": "Pelajar"
    }
  ],
  "employmentSlips": [
    {
      "employer": "PT Nusantara Digital",
      "employerNpwp": "01.234.567.8-052.000",
      "gross": 180000000,
      "deduction": 6000000,
      "net": 174000000
    }
  ],
  "withholdingSlips": [
    {
      "withholder": "PT Nusantara Digital",
      "withholderNpwp": "01.234.567.8-052.000",
      "slipNo": "1721-2025-00001234",
      "date": "2025-12-31",
      "taxType": "PPh Pasal 21",
      "taxBase": 180000000,
      "amount": 7000000
    },
    {
      "withholder": "PT Sinar Abadi",
      "withholderNpwp": "02.345.678.9-011.000",
      "slipNo": "2323-2025-00000456",
      "date": "2025-08-15",
      "taxType": "PPh Pasal 23",
      "taxBase": 40000000,
      "amount": 2000000
    }
  ],
  "declarationAgree": false
}
    $json$::jsonb,
    10650000, 9000000, 1650000, 'Kurang Bayar'
FROM users u
WHERE u.username = '0912345678901234'
  AND NOT EXISTS (
      SELECT 1 FROM spt_returns s
      WHERE s.user_id = u.id AND s.tax_year = 2025
  );
