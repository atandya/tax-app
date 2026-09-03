# Synthetic Tax Data Bank

> **DISCLAIMER — NONE OF THESE SAMPLE RECORDS ARE REAL.** All taxpayer identities, credentials, identifiers, documents, accounts, addresses, and financial records below are invented for this prototype. Institution names reused from the demo are labels only, not evidence of real account relationships or endorsements. These records are not valid government or banking documents. Never use them on the real Coretax/DJP service or attempt a real payment. Do not enter real personal data into the demo.

Use any records needed to complete a fictional tax-reporting scenario. Personal circumstances—such as marital status, number of children, income, assets, and debts—can be chosen freely.

## Start with one scenario

[Open the demo](https://coretax-demo.vercel.app/login) ·
[Read the usage instructions](README.md#start-here--no-indonesian-id-required)

| Fact | Starting value |
|---|---|
| Taxpayer | Budi Santoso — use the demo account below |
| Tax year | 2025 |
| Marital status | Married |
| Eligible dependant count | 1 — Siti Rahma Santoso, listed below |
| Employment | Package A: PT Nusantara Digital |
| Savings | Bank Nusantara account below; year-end balance `85000000` IDR; opened in 2019 |
| Other income / debts | None for this fictional scenario |
| Additional religious-contribution deduction | `0` IDR |

Tell the assistant: “In this fictional scenario, I was married at the end of
2025 and supported one eligible dependent child. Please save that profile.”
The prototype maps those facts to **K/1**. Eligibility is a given scenario fact,
not a legal assessment. The current WebMCP tools save the profile only; the
financial and family-table records below are for manual entry.

The shared demo draft contains additional sample records and may have been
changed by another visitor. This data bank is not a snapshot of that draft.
Opening this document does not load or reset data, and changing the profile
does not overwrite the other records. Avoid adding duplicates.

## Reading the fields

- **NIK** is a national identity number; **NPWP** is a tax identification number.
  Keep leading zeroes. Use the digits-only user ID for demo login, not the
  punctuated NPWP.
- **SPT Tahunan** means annual tax return. **PTKP** is the personal tax-free
  allowance classification used by the prototype.
- **Bukti Potong** is a withholding record: tax an employer or another
  organisation has already withheld. It is different from an income deduction.
- **IDR / Rp** means Indonesian rupiah. Amounts below are annual unless stated
  otherwise. Enter `180000000` in a numeric field; `Rp180,000,000` here and
  `Rp 180.000.000` on the website represent the same amount.
- Dates are written in English below. For example, 31 December 2025 is
  `2025-12-31` in a YYYY-MM-DD field.
- Document amounts and tax-type labels are prototype inputs, not a statement
  of legally correct withholding calculations or entitlement to deductions.

## Demo access

| Field | Demo value |
|---|---|
| Taxpayer user ID / synthetic NIK | `0912345678901234` |
| Password | `Wajib2025!` |
| Taxpayer name | Budi Santoso |
| Taxpayer NPWP | `09.123.456.7-890.000` |
| Email | `budi.santoso@example.com` |

Admin account for the post-submission review flow:

| Field | Demo value |
|---|---|
| Admin user ID | `admin` |
| Password | `Admin2025!` |

## Spouse identity

Use this record when the fictional taxpayer is married.

| Field | Demo value |
|---|---|
| Name | Ayu Lestari Santoso |
| Synthetic NIK | `3275015206900001` |
| Synthetic NPWP | `09.876.543.2-101.000` |
| Date of birth | 12 June 1990 |
| Occupation | Private-sector employee / Karyawan Swasta |

## Children and dependant identities

Use zero, one, or all five records according to the fictional taxpayer's circumstances.

| Name | Synthetic NIK | Date of birth | Relationship | Occupation |
|---|---|---|---|---|
| Aditya Santoso | `3275011503100001` | 15 March 2010 | Biological child / Anak Kandung | Student / Pelajar |
| Nabila Santoso | `3275016208120002` | 22 August 2012 | Biological child / Anak Kandung | Student / Pelajar |
| Siti Rahma Santoso | `3275014204150002` | 12 April 2015 | Biological child / Anak Kandung | Student / Pelajar |
| Raka Santoso | `3275010909180003` | 9 September 2018 | Biological child / Anak Kandung | Student / Pelajar |
| Kirana Santoso | `3275014711210004` | 7 November 2021 | Biological child / Anak Kandung | Not yet in school / Belum Sekolah |

The family table may contain all five children. PTKP is a separate tax classification: the current prototype supports an eligible-dependant count from zero to three. When more than three children are reported, distinguish **actual children** from the **dependant count used for PTKP**.

## Parent/dependant identities

These records can be used when the fictional taxpayer supports a parent.

| Name | Synthetic NIK | Date of birth | Relationship | Occupation |
|---|---|---|---|---|
| Hendra Santoso | `3275011002550001` | 10 February 1955 | Father / Ayah | Retired / Pensiunan |
| Ratna Wulandari | `3275014508580002` | 5 August 1958 | Mother / Ibu | Homemaker / Ibu Rumah Tangga |

## Employment and Indonesian withholding documents

Each package contains a complete employer identity and Indonesian withholding-slip reference. Use one or more packages according to the fictional employment history.

### Employment package A — PT Nusantara Digital

| Field | Demo value |
|---|---|
| Employer | PT Nusantara Digital |
| Employer NPWP | `01.234.567.8-052.000` |
| Withholding slip number | `1721-2025-00001234` |
| Slip date | 31 December 2025 |
| Tax type | PPh Article 21 |
| Annual gross income | Rp180,000,000 |
| Employment deduction | Rp6,000,000 |
| Annual net income | Rp174,000,000 |
| Tax base shown on slip | Rp180,000,000 |
| Tax withheld | Rp7,000,000 |

### Employment package B — PT Sinar Abadi

| Field | Demo value |
|---|---|
| Employer | PT Sinar Abadi |
| Employer NPWP | `02.345.678.9-011.000` |
| Withholding slip number | `1721-2025-00004567` |
| Slip date | 31 December 2025 |
| Tax type | PPh Article 21 |
| Annual gross income | Rp96,000,000 |
| Employment deduction | Rp4,800,000 |
| Annual net income | Rp91,200,000 |
| Tax base shown on slip | Rp96,000,000 |
| Tax withheld | Rp2,000,000 |

### Employment package C — PT Garuda Teknologi

| Field | Demo value |
|---|---|
| Employer | PT Garuda Teknologi |
| Employer NPWP | `03.456.789.0-021.000` |
| Withholding slip number | `1721-2025-00007890` |
| Slip date | 31 December 2025 |
| Tax type | PPh Article 21 |
| Annual gross income | Rp240,000,000 |
| Employment deduction | Rp6,000,000 |
| Annual net income | Rp234,000,000 |
| Tax base shown on slip | Rp240,000,000 |
| Tax withheld | Rp18,000,000 |

### Freelance/service withholding record

Use this record for a fictional taxpayer with freelance or other service income.

| Field | Demo value |
|---|---|
| Withholder | PT Sinar Abadi |
| Withholder NPWP | `02.345.678.9-011.000` |
| Withholding slip number | `2323-2025-00000456` |
| Slip date | 15 August 2025 |
| Tax type | PPh Article 23 |
| Gross/tax base | Rp40,000,000 |
| Tax withheld | Rp2,000,000 |

## Deduction document

Use this record when reporting qualifying zakat or a mandatory religious contribution.

| Field | Demo value |
|---|---|
| Receiving organisation | Yayasan Amanah Nusantara |
| Organisation NPWP | `04.567.890.1-031.000` |
| Receipt number | `ZKT-2025-009812` |
| Receipt date | 20 December 2025 |
| Amount | Rp6,000,000 |

When no qualifying payment is reported, the deduction is Rp0 and this record is not used.

## Bank and investment references

| Item | Institution | Synthetic institution NPWP | Account/reference |
|---|---|---|---|
| Savings account | Bank Mandiri | `01.999.888.7-054.000` | `1234567890` |
| Secondary savings account | Bank Nusantara | `05.678.901.2-041.000` | `009876543210` |
| Mutual fund | PT Manulife Aset Manajemen Indonesia | `01.111.222.3-045.000` | `RD-88213` |
| Share-investment account | PT Investasi Digital Nusantara | `06.789.012.3-051.000` | `SID-ID-2025-001234` |

Balances and acquisition values can be chosen freely for the fictional scenario.

## Loan and creditor references

| Debt type | Creditor | Synthetic creditor NPWP | Account/reference |
|---|---|---|---|
| Home mortgage / KPR | Bank BTN | `01.234.567.8-901.000` | `KPR-2018-001234` |
| Credit card | Bank Mandiri | `01.999.888.7-054.000` | `CC-2024-008812` |
| Vehicle financing | PT Pembiayaan Nusantara | `07.890.123.4-061.000` | `AUTO-2023-004321` |

Choose the applicable debt, borrowing year, and outstanding balance for the fictional scenario.

## Asset evidence

These are fictional identifiers for asset types that commonly require a locally recognisable ownership or account reference.

| Asset | Demo ownership/reference number | Location/address |
|---|---|---|
| Car | `BPKB-N-2020-001234` | Bekasi, West Java |
| Motorcycle | `BPKB-M-2022-005678` | Bekasi, West Java |
| Residential property | `SHM 01234` | Jl. Melati No. 12, Bekasi Selatan, West Java 17148 |
| Second property | `SHM 05678` | Jl. Kenanga No. 8, Bandung, West Java 40115 |
| Receivable/loan to another person | Borrower NIK `3271091902010011`; borrower Andi Wijaya | Indonesia |

Choose the applicable assets, acquisition years, acquisition values, and current values for the fictional scenario.

## Indonesian payment references

Use these only if the prototype asks for payment-related data in an underpayment scenario.

| Field | Demo value |
|---|---|
| Billing code / Kode Billing | `820250903123456` |
| State receipt number / NTPN | `A1B2C3D4E5F6G7H8` |
| Payment date | 2 September 2026 |
| Payment channel | Bank Mandiri internet banking |

No real payment should be initiated. These references exist only to prevent an Indonesian-document field from blocking the fictional flow.

## Values that can be invented freely

The following facts can be selected freely:

- Married or unmarried status.
- Number of children and other family members.
- Which family members qualify as dependants.
- Salary and other income amounts.
- Number of employers.
- Business, freelance, domestic-other, or foreign income.
- Zakat or other supported deductions.
- Assets, acquisition years, and values.
- Debts, borrowing years, and balances.
- Yes/no answers about their fictional financial year.

When one of those choices leads to an Indonesia-specific document field, select a matching synthetic identity or reference from this data bank.

## Do not use real data

The prototype must never require a real:

- NIK or NPWP.
- Indonesian employer record.
- Withholding certificate.
- Bank or investment account.
- Property or vehicle ownership document.
- Billing/payment reference.
- OTP, electronic certificate, passphrase, or government account credential.

Use the fixed demo login and invented records for this prototype. The shared
account's data persists and can be seen or changed by other demo visitors.
Never supply a real government password, OTP, tax document, or bank account.
