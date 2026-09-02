"use client";

import { useMemo, useState, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Me } from "../../_lib/session";
import {
  BUKTI_POTONG_COLUMNS,
  computeSptClient,
  employmentNet,
  HARTA_TABLES,
  HEADER_METHOD,
  HEADER_SOURCE,
  HEADER_STATUS,
  KELUARGA_COLUMNS,
  PEKERJAAN_COLUMNS,
  PTKP_OPTIONS,
  rupiah,
  STATUS_META,
  sumAssets,
  UTANG_COLUMNS,
  type SptData,
  type SptReturn,
  type SptStatus,
  type TableCol,
  type YaTidak,
} from "../../_lib/spt";
import { ArrowRight, Chevron, InfoCircle } from "../../_components/icons";
import { Button, LinkButton } from "../../_components/ui";

type Tab = "induk" | "l1";
type Row = Record<string, string | number | undefined>;

export function SptForm({ me, initial }: { me: Me; initial: SptReturn }) {
  const router = useRouter();
  const [spt, setSpt] = useState<SptReturn>(initial);
  const [data, setData] = useState<SptData>(initial.data ?? {});
  const [tab, setTab] = useState<Tab>("induk");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const editable = spt.status === "DRAFT" || spt.status === "REJECTED";
  const c = useMemo(() => computeSptClient(data), [data]);
  const signedBalance = c.pphOwed - c.pphCredit;
  // A.7 Ikhtisar Harta — harga perolehan + nilai saat ini across all six
  // sub-tables (Kas reads Saldo, Piutang reads Nilai/Saldo Piutang).
  const hartaTotals = useMemo(() => sumAssets(data.assets), [data.assets]);

  // ---- mutation ----
  function patch(mut: (d: SptData) => void) {
    setData((prev) => {
      const next = structuredClone(prev);
      mut(next);
      return next;
    });
    setDirty(true);
    setMsg(null);
  }
  const ans = (k: string): YaTidak => data.answers?.[k] ?? "tidak";
  function setAns(k: string, v: YaTidak, clear?: () => void) {
    patch((d) => {
      d.answers = { ...d.answers, [k]: v };
    });
    if (v === "tidak" && clear) clear();
  }
  const setIncome = (k: "employment" | "business" | "other" | "foreign", v: number) =>
    patch((d) => (d.income = { ...d.income, [k]: v }));
  const setCredit = (k: "withholding" | "installment25" | "stp25", v: number) =>
    patch((d) => (d.credits = { ...d.credits, [k]: v }));
  const setZakat = (v: number) =>
    patch((d) => (d.deductions = { ...d.deductions, zakat: v }));
  const setHeader = (k: string, v: string | number) =>
    patch((d) => (d.header = { ...d.header, [k]: v }));

  // employment slips (L-1 D) → sum feeds income.employment
  function setEmploymentSlips(input: Row[]) {
    // Neto is derived (bruto − pengurangan), exactly as Coretax computes it.
    const rows = input.map((r) => ({ ...r, net: employmentNet(r) }));
    const sum = rows.reduce((s, r) => s + r.net, 0);
    patch((d) => {
      d.employmentSlips = rows;
      d.income = { ...d.income, employment: sum };
      d.answers = { ...d.answers, q1a: sum > 0 ? "ya" : d.answers?.q1a ?? "tidak" };
    });
  }
  // assets grouped by category
  function setCategoryAssets(category: string, rows: Row[]) {
    patch((d) => {
      const others = (d.assets ?? []).filter((a) => a.category !== category);
      d.assets = [...others, ...rows.map((r) => ({ ...r, category }))];
    });
  }

  // ---- persistence ----
  async function save(): Promise<SptReturn | null> {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/be/spt/${spt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan.");
      const updated = (await res.json()) as SptReturn;
      setSpt(updated);
      setData(updated.data ?? {});
      setDirty(false);
      setMsg({ kind: "ok", text: "Konsep tersimpan." });
      return updated;
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Kesalahan." });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!data.declarationAgree) {
      setMsg({ kind: "err", text: "Centang pernyataan pada bagian K sebelum melapor." });
      setTab("induk");
      return;
    }
    setSubmitting(true);
    const saved = await save();
    if (!saved) return setSubmitting(false);
    try {
      const res = await fetch(`/api/be/spt/${spt.id}/submit`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(b?.message ?? "Gagal melaporkan SPT.");
      }
      const updated = (await res.json()) as SptReturn;
      setSpt(updated);
      setMsg({ kind: "ok", text: "SPT berhasil dikirim dan menunggu peninjauan petugas." });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Kesalahan." });
    } finally {
      setSubmitting(false);
    }
  }

  const npwp = spt.taxpayer_npwp ?? me.npwp ?? "-";
  const name = spt.taxpayer_name ?? me.name;

  return (
    <main className="app-container py-8 pb-36 sm:py-10">
      {/* Title bar */}
      <nav className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
        <Link href="/spt" className="font-bold text-djp-blue hover:underline">
          Beranda
        </Link>
        <span aria-hidden>›</span>
        <span>Surat Pemberitahuan (SPT)</span>
        <span className="hidden sm:inline">· Personal Income Tax Return</span>
      </nav>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <h1 className="max-w-3xl font-heading text-xl font-extrabold uppercase leading-snug text-djp-blue sm:text-2xl">
          SPT Tahunan Pajak Penghasilan (PPh) Wajib Pajak Orang Pribadi
        </h1>
        <span className="inline-flex h-8 shrink-0 items-center rounded-md bg-zinc-700 px-3.5 text-xs font-bold tracking-wide text-white">
          XML Monitoring
        </span>
      </div>

      {spt.status === "REJECTED" && spt.rejection_reason && (
        <Banner kind="err">
          <b>SPT ditolak petugas.</b> {spt.rejection_reason} — perbaiki lalu kirim ulang.
        </Banner>
      )}
      {msg && <Banner kind={msg.kind}>{msg.text}</Banner>}

      {/* Tabs */}
      <div className="mt-8 flex items-center gap-8 border-b border-djp-blue/15">
        <TabBtn active={tab === "induk"} onClick={() => setTab("induk")}>
          Induk
        </TabBtn>
        <TabBtn active={tab === "l1"} onClick={() => setTab("l1")}>
          L-1
        </TabBtn>
        <div className="ml-auto pb-2.5">
          <StatusBadge status={spt.status} />
        </div>
      </div>

      {tab === "induk" ? (
        <div className="mt-6 space-y-6">
          {/* HEADER */}
          <Panel title="Header">
            <NumRow label="Tahun Pajak / Bagian Tahun Pajak">
              <ReadInput value={String(spt.tax_year)} />
            </NumRow>
            <NumRow label="Status">
              <Select
                value={data.header?.status ?? "Normal"}
                options={HEADER_STATUS}
                disabled={!editable}
                onChange={(v) => setHeader("status", v)}
              />
            </NumRow>
            <NumRow label="Metode Pembukuan / Pencatatan">
              <Select
                value={data.header?.method ?? "Pencatatan"}
                options={HEADER_METHOD}
                disabled={!editable}
                onChange={(v) => setHeader("method", v)}
              />
            </NumRow>
            <NumRow label="Periode Pembukuan">
              <div className="flex items-center gap-2">
                <NumInput
                  value={data.header?.periodStart ?? 1}
                  disabled={!editable}
                  onChange={(v) => setHeader("periodStart", v)}
                />
                <span className="text-[var(--text-muted)]">—</span>
                <NumInput
                  value={data.header?.periodEnd ?? 12}
                  disabled={!editable}
                  onChange={(v) => setHeader("periodEnd", v)}
                />
              </div>
            </NumRow>
            <NumRow label="Sumber Penghasilan">
              <Select
                value={data.header?.source ?? "Pekerjaan"}
                options={HEADER_SOURCE}
                disabled={!editable}
                onChange={(v) => setHeader("source", v)}
              />
            </NumRow>
            <div className="px-5 py-5">
              <span className="inline-flex h-10 items-center rounded-lg bg-djp-blue px-6 text-xs font-bold text-white">
                Posting SPT
              </span>
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
                Klik tombol “Posting SPT” untuk menampilkan data perpajakan Anda
                (Harta, Utang, Daftar Anggota Keluarga, Bukti Potong PPh,
                Pembayaran, dan lainnya).
              </p>
            </div>
          </Panel>

          {/* A. IDENTITAS */}
          <Panel title="A. Identitas Wajib Pajak">
            <NumRow n="1" label="NIK/NPWP" req>
              <ReadInput value={npwp} />
            </NumRow>
            <NumRow n="2" label="Nama" req>
              <ReadInput value={name} />
            </NumRow>
            <NumRow n="3" label="Jenis ID" req>
              <ReadInput value="KTP" />
            </NumRow>
            <NumRow n="4" label="No. ID" req>
              <ReadInput value={npwp} />
            </NumRow>
            <NumRow n="5" label="No. Telepon" req>
              <ReadInput value={me.username} />
            </NumRow>
            <NumRow n="6" label="Email" req>
              <ReadInput value="—" />
            </NumRow>
            <NumRow
              n="7"
              label="Status Kewajiban Perpajakan Suami dan Istri (Isi jika status adalah PH/MT)"
            >
              <Select value="Silakan Pilih" options={["Silakan Pilih", "PH", "MT"]} disabled onChange={() => {}} />
            </NumRow>
            <NumRow n="8" label="NIK/NPWP Suami/Istri">
              <ReadInput value="—" />
            </NumRow>
          </Panel>

          {/* B. IKHTISAR PENGHASILAN NETO */}
          <Panel title="B. Ikhtisar Penghasilan Neto">
            <QRow
              n="1"
              label="Apakah Anda menerima penghasilan dalam negeri dari pekerjaan?"
              req
              value={ans("q1a")}
              disabled={!editable}
              onChange={(v) => setAns("q1a", v)}
              hintYa="Ya, silahkan mengisi lampiran I Bagian D"
              hintTidak="Tidak, lanjutkan ke pertanyaan 1b"
              amount={<ReadMoney value={data.income?.employment ?? 0} />}
            />
            <QRow
              n="1.b"
              label="Apakah Anda menerima penghasilan dalam negeri dari usaha dan/atau pekerjaan bebas?"
              req
              value={ans("q1b")}
              disabled={!editable}
              onChange={(v) => setAns("q1b", v, () => setIncome("business", 0))}
              hintYa="Ya, isikan penghasilan neto usaha/pekerjaan bebas"
              hintTidak="Tidak, lanjutkan ke pertanyaan 1c"
              amount={
                ans("q1b") === "ya" ? (
                  <MoneyInput value={data.income?.business} disabled={!editable} onChange={(v) => setIncome("business", v)} />
                ) : (
                  <ReadMoney value={0} />
                )
              }
            />
            <QRow
              n="1.c"
              label="Apakah Anda menerima penghasilan dalam negeri lainnya?"
              req
              value={ans("q1c")}
              disabled={!editable}
              onChange={(v) => setAns("q1c", v, () => setIncome("other", 0))}
              hintYa="Ya, isikan penghasilan neto dalam negeri lainnya"
              hintTidak="Tidak, lanjutkan ke pertanyaan 1d"
              amount={
                ans("q1c") === "ya" ? (
                  <MoneyInput value={data.income?.other} disabled={!editable} onChange={(v) => setIncome("other", v)} />
                ) : (
                  <ReadMoney value={0} />
                )
              }
            />
            <QRow
              n="1.d"
              label="Apakah Anda menerima penghasilan luar negeri?"
              req
              value={ans("q1d")}
              disabled={!editable}
              onChange={(v) => setAns("q1d", v, () => setIncome("foreign", 0))}
              hintYa="Ya, isikan penghasilan neto luar negeri"
              hintTidak="Tidak, silahkan lanjut pertanyaan berikutnya"
              amount={
                ans("q1d") === "ya" ? (
                  <MoneyInput value={data.income?.foreign} disabled={!editable} onChange={(v) => setIncome("foreign", v)} />
                ) : (
                  <ReadMoney value={0} />
                )
              }
            />
          </Panel>

          {/* C. PENGHITUNGAN PAJAK TERUTANG */}
          <Panel title="C. Penghitungan Pajak Terutang">
            <NumRow n="2" label="Penghasilan neto setahun (1a+1b+1c+1d)">
              <ReadMoney value={c.totalNet} />
            </NumRow>
            <QRow
              n="3"
              label="Apakah terdapat pengurang penghasilan neto seperti kompensasi kerugian atau zakat/sumbangan keagamaan wajib?"
              value={ans("q3")}
              disabled={!editable}
              onChange={(v) => setAns("q3", v, () => setZakat(0))}
              hintYa="Ya, isikan jumlah pengurang penghasilan neto"
              hintTidak="Tidak, silahkan lanjut pertanyaan berikutnya"
              amount={
                ans("q3") === "ya" ? (
                  <MoneyInput value={data.deductions?.zakat} disabled={!editable} onChange={setZakat} />
                ) : (
                  <ReadMoney value={0} />
                )
              }
            />
            <NumRow n="4" label="Penghasilan neto setelah pengurang penghasilan neto (2-3)">
              <ReadMoney value={c.netAfterDeduction} />
            </NumRow>
            <NumRow n="5" label="Penghasilan Tidak Kena Pajak">
              <div className="flex items-center gap-3">
                <Select
                  value={data.identity?.ptkp ?? "TK/0"}
                  options={PTKP_OPTIONS.map((p) => p.code)}
                  disabled={!editable}
                  onChange={(v) => patch((d) => (d.identity = { ...d.identity, ptkp: v }))}
                  className="w-28 shrink-0"
                />
                <ReadMoney value={c.ptkpAmount} />
              </div>
            </NumRow>
            <NumRow n="6" label="Penghasilan Kena Pajak (4-5)">
              <ReadMoney value={c.taxableIncome} />
            </NumRow>
            <NumRow n="7" label="PPh Terutang">
              <ReadMoney value={c.pphOwed} strong />
            </NumRow>
            <QRow
              n="8"
              label="Apakah terdapat pengurang PPh Terutang?"
              value={ans("q8")}
              disabled={!editable}
              onChange={(v) => setAns("q8", v)}
              hintYa="Ya, isikan pengurang PPh Terutang"
              hintTidak="Tidak, silahkan lanjut pertanyaan berikutnya"
              amount={<ReadMoney value={0} />}
            />
            <NumRow n="9" label="PPh Terutang setelah pengurang PPh Terutang (7-8)">
              <ReadMoney value={c.pphOwed} strong />
            </NumRow>
          </Panel>

          {/* D. KREDIT PAJAK */}
          <Panel title="D. Kredit Pajak">
            <QRow
              n="10.a"
              label="Apakah terdapat PPh yang telah dipotong/dipungut oleh pihak lain?"
              req
              value={ans("q10a")}
              disabled={!editable}
              onChange={(v) => setAns("q10a", v, () => setCredit("withholding", 0))}
              hintYa="Ya, isikan jumlah PPh yang dipotong/dipungut pihak lain"
              hintTidak="Tidak, lanjutkan ke pertanyaan berikutnya"
              amount={
                ans("q10a") === "ya" ? (
                  <MoneyInput value={data.credits?.withholding} disabled={!editable} onChange={(v) => setCredit("withholding", v)} />
                ) : (
                  <ReadMoney value={0} />
                )
              }
            />
            <NumRow n="10.b" label="Angsuran PPh Pasal 25">
              <MoneyInput value={data.credits?.installment25} disabled={!editable} onChange={(v) => setCredit("installment25", v)} />
            </NumRow>
            <NumRow n="10.c" label="STP PPh Pasal 25 (Hanya pokok pajak)">
              <MoneyInput value={data.credits?.stp25} disabled={!editable} onChange={(v) => setCredit("stp25", v)} />
            </NumRow>
            <QRow
              n="10.d"
              label="Apakah Anda menerima pengembalian/pengurangan kredit PPh luar negeri yang telah dikreditkan?"
              req
              value={ans("q10d")}
              disabled={!editable}
              onChange={(v) => setAns("q10d", v)}
              hintYa="Ya, isikan jumlah pengembalian/pengurangan"
              hintTidak="Tidak, lanjutkan ke pertanyaan berikutnya"
              amount={<ReadMoney value={0} />}
            />
          </Panel>

          {/* E. PPH KURANG/LEBIH BAYAR */}
          <Panel title="E. PPh Kurang/Lebih Bayar">
            <NumRow n="11.a" label="PPh kurang/lebih bayar (9-10a-10b-10c+10d)">
              <ReadMoney value={signedBalance} strong />
            </NumRow>
            <QRow
              n="11.b"
              label="Apakah terdapat Surat Keputusan Persetujuan Pengangsuran atau Penundaan Pembayaran Pajak?"
              value={ans("q11b")}
              disabled={!editable}
              onChange={(v) => setAns("q11b", v)}
              hintYa="Ya, isikan nilai berdasarkan surat keputusan"
              hintTidak="Tidak. Saya tidak memilikinya"
              amount={<ReadMoney value={0} />}
            />
            <NumRow n="11.c" label="PPh yang masih harus dibayar (11a-11b)">
              <ReadMoney value={signedBalance} strong />
            </NumRow>
          </Panel>

          {/* F. PEMBETULAN */}
          <Panel title="F. Pembetulan (Diisi jika status SPT adalah Pembetulan)">
            <NumRow n="12.a" label="PPh kurang/lebih bayar pada SPT yang dibetulkan">
              <ReadMoney value={0} />
            </NumRow>
            <NumRow n="12.b" label="PPh kurang/lebih bayar karena pembetulan (11a-12a)">
              <ReadMoney value={0} />
            </NumRow>
          </Panel>

          {/* G. PERMOHONAN PENGEMBALIAN */}
          <Panel title="G. Permohonan Pengembalian PPh Lebih Bayar (Diisi jika status SPT adalah Lebih Bayar)">
            <NumRow label="PPh lebih bayar pada 11a atau 12b mohon">
              <Select value="Silakan Pilih" options={["Silakan Pilih", "Dikembalikan", "Diperhitungkan"]} disabled onChange={() => {}} />
            </NumRow>
            <NumRow label="Nomor Rekening">
              <ReadInput value="—" />
            </NumRow>
            <NumRow label="Nama Bank">
              <ReadInput value="—" />
            </NumRow>
            <NumRow label="Nama Pemilik Rekening">
              <ReadInput value="—" />
            </NumRow>
          </Panel>

          {/* H. ANGSURAN PPh 25 TAHUN BERIKUTNYA */}
          <Panel title="H. Angsuran PPh Pasal 25 Tahun Pajak Berikutnya">
            <QRow
              n="13.a"
              label="Apakah Anda menerima penghasilan teratur dan berkewajiban membayar angsuran PPh Pasal 25 Tahun Pajak berikutnya?"
              value={ans("q13a")}
              disabled={!editable}
              onChange={(v) => setAns("q13a", v)}
              hintYa="Ya, silahkan lanjut pertanyaan berikutnya"
              hintTidak="Tidak, silahkan lanjut pertanyaan berikutnya"
            />
            <QRow
              n="13.b"
              label="Apakah Anda menyusun perhitungan tersendiri angsuran PPh Pasal 25 Tahun Pajak berikutnya?"
              value={ans("q13b")}
              disabled={!editable}
              onChange={(v) => setAns("q13b", v)}
              hintYa="Ya, silahkan lanjut pertanyaan berikutnya"
              hintTidak="Tidak, silahkan lanjut pertanyaan berikutnya"
            />
            <QRow
              n="13.c"
              label="Apakah Anda membayar angsuran PPh Pasal 25 OPPT Tahun Pajak berikutnya?"
              value={ans("q13c")}
              disabled={!editable}
              onChange={(v) => setAns("q13c", v)}
              hintYa="Ya, silahkan lanjut pertanyaan berikutnya"
              hintTidak="Tidak, tidak ada kewajiban untuk membayar angsuran pajak penghasilan Pasal 25"
            />
          </Panel>

          {/* I. PERNYATAAN TRANSAKSI LAINNYA */}
          <Panel title="I. Pernyataan Transaksi Lainnya">
            <NumRow n="14.a" label="Harta pada akhir Tahun Pajak (Isi Lampiran I Bagian A)">
              <ReadMoney value={hartaTotals.current} />
            </NumRow>
            {[
              ["q14b", "14.b", "Apakah Anda memiliki utang pada akhir tahun pajak?", true],
              ["q14c", "14.c", "Apakah Anda menerima penghasilan yang dikenakan pajak penghasilan bersifat final?", true],
              ["q14d", "14.d", "Apakah Anda menerima penghasilan yang tidak termasuk objek pajak?", true],
              ["q14e", "14.e", "Apakah Anda melaporkan biaya penyusutan dan/atau amortisasi fiskal?", false],
              ["q14f", "14.f", "Apakah Anda melaporkan biaya entertainment, promosi, natura/kenikmatan, atau piutang tak tertagih?", true],
              ["q14g", "14.g", "Apakah Anda menerima dividen/penghasilan lain dari luar negeri sebagai bukan objek pajak?", true],
            ].map(([key, n, label, req]) => (
              <QRow
                key={key as string}
                n={n as string}
                label={label as string}
                req={req as boolean}
                value={ans(key as string)}
                disabled={!editable}
                onChange={(v) => setAns(key as string, v)}
                hintYa="Ya, lanjutkan ke pertanyaan berikutnya"
                hintTidak="Tidak, lanjutkan ke pertanyaan berikutnya"
              />
            ))}
            <NumRow n="14.h" label="Kelebihan PPh Final atas penghasilan usaha peredaran bruto tertentu yang dapat dimintakan pengembalian">
              <ReadMoney value={0} />
            </NumRow>
          </Panel>

          {/* J. LAMPIRAN TAMBAHAN */}
          <Panel title="J. Lampiran Tambahan">
            <NumRow label="a. Laporan Keuangan / Laporan Keuangan yang telah diaudit">
              <span className="text-xs text-djp-blue">
                Tidak, jenis pembukuan adalah Pembukuan Sederhana.
              </span>
            </NumRow>
            <NumRow label="b. Bukti pembayaran zakat/sumbangan keagamaan">
              <span className="text-xs text-djp-blue">Tidak ada berkas yang perlu dilampirkan</span>
            </NumRow>
            <NumRow label="c. Bukti pemotongan/pemungutan sehubungan dengan kredit pajak luar negeri">
              <span className="text-xs text-djp-blue">Tidak ada berkas yang perlu dilampirkan</span>
            </NumRow>
            <NumRow label="d. Surat kuasa khusus">
              <span className="text-xs text-[var(--text-muted)]">Tidak</span>
            </NumRow>
            <NumRow label="e. Dokumen lainnya">
              <span className="text-xs text-[var(--text-muted)]">Tidak</span>
            </NumRow>
          </Panel>

          {/* K. PERNYATAAN */}
          <Panel title="K. Pernyataan">
            <div className="px-5 pt-5">
              <span className="inline-flex items-center gap-2 rounded-md bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700">
                <InfoCircle className="h-4 w-4 shrink-0" />
                Status SPT : {c.paymentStatus}
              </span>
            </div>
            <label className="flex cursor-pointer items-start gap-3.5 px-5 py-5">
              <input
                type="checkbox"
                checked={!!data.declarationAgree}
                onChange={(e) => patch((d) => (d.declarationAgree = e.target.checked))}
                disabled={!editable}
                className="mt-0.5 h-4 w-4 shrink-0 accent-djp-blue"
              />
              <span className="max-w-3xl text-xs leading-relaxed text-[var(--text-soft)]">
                Dengan menyadari sepenuhnya akan segala akibatnya termasuk
                sanksi-sanksi sesuai dengan ketentuan perundang-undangan yang
                berlaku, saya menyatakan bahwa apa yang telah saya beritahukan di
                atas beserta lampirannya adalah <b>benar, lengkap, dan jelas</b>.
              </span>
            </label>
            <NumRow label="Penandatangan">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <Radio
                  label="Wajib Pajak"
                  checked={(data.identity?.signer ?? "wp") === "wp"}
                  disabled={!editable}
                  onChange={() => patch((d) => (d.identity = { ...d.identity, signer: "wp" }))}
                />
                <Radio
                  label="Kuasa Wajib Pajak"
                  checked={data.identity?.signer === "kuasa"}
                  disabled={!editable}
                  onChange={() => patch((d) => (d.identity = { ...d.identity, signer: "kuasa" }))}
                />
              </div>
            </NumRow>
            <NumRow label="NPWP">
              <ReadInput value={npwp} />
            </NumRow>
            <NumRow label="Nama Lengkap">
              <ReadInput value={name} />
            </NumRow>
          </Panel>
        </div>
      ) : (
        /* ================= L-1 ================= */
        <div className="mt-6 space-y-6">
          <Panel title="Header">
            <NumRow label="Tahun Pajak">
              <ReadInput value={String(spt.tax_year)} />
            </NumRow>
            <NumRow label="NPWP">
              <ReadInput value={npwp} />
            </NumRow>
          </Panel>

          <Panel title="A. Harta pada Akhir Tahun Pajak">
            {HARTA_TABLES.map((t, i) => (
              <SubTable
                key={t.category}
                title={`${i + 1}. ${t.category.toUpperCase()}`}
                editable={editable}
                columns={t.columns}
                rows={(data.assets ?? []).filter((a) => a.category === t.category) as Row[]}
                onChange={(rows) => setCategoryAssets(t.category, rows)}
                totalKeys={t.totalKeys}
                totalLabel={t.totalLabel}
              />
            ))}
            <div className="border-t-2 border-djp-blue/20 px-5 py-5">
              <div className="mb-3 rounded-md bg-djp-blue/90 px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-white">
                7. Ikhtisar Harta
              </div>
              <div className="overflow-x-auto rounded-lg border border-djp-blue/15">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="bg-djp-blue/5 text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      <th className="px-3 py-3 font-bold">Deskripsi</th>
                      <th className="w-48 px-3 py-3 text-right font-bold">Harga Perolehan</th>
                      <th className="w-48 px-3 py-3 text-right font-bold">Nilai Saat Ini</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-djp-blue/10">
                      <td className="px-3 py-3.5 text-sm font-extrabold text-djp-blue">
                        Jumlah Harta pada Akhir Tahun Pajak
                      </td>
                      <td className="px-3 py-3.5 text-right text-sm font-extrabold tabular-nums text-djp-blue">
                        {hartaTotals.acquisition.toLocaleString("id-ID")}
                      </td>
                      <td className="px-3 py-3.5 text-right text-sm font-extrabold tabular-nums text-djp-blue">
                        {hartaTotals.current.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>

          <Panel title="B. Utang pada Akhir Tahun Pajak">
            <SubTable
              title=""
              editable={editable}
              columns={UTANG_COLUMNS}
              rows={(data.debts ?? []) as Row[]}
              onChange={(rows) => patch((d) => (d.debts = rows))}
              totalKeys={["balance"]}
              totalLabel="Jumlah Bagian B"
            />
          </Panel>

          <Panel title="C. Daftar Anggota Keluarga yang Menjadi Tanggungan">
            <SubTable
              title=""
              editable={editable}
              columns={KELUARGA_COLUMNS}
              rows={(data.family ?? []) as Row[]}
              onChange={(rows) => patch((d) => (d.family = rows))}
            />
          </Panel>

          <Panel title="D. Penghasilan Neto Dalam Negeri dari Pekerjaan">
            <SubTable
              title=""
              editable={editable}
              columns={PEKERJAAN_COLUMNS}
              rows={(data.employmentSlips ?? []) as Row[]}
              onChange={setEmploymentSlips}
              totalKeys={["gross", "deduction", "net"]}
              totalLabel="Jumlah Penghasilan Neto (ke 1a)"
            />
          </Panel>

          <Panel title="E. Daftar Bukti Pemotongan/Pemungutan PPh">
            <SubTable
              title=""
              editable={editable}
              columns={BUKTI_POTONG_COLUMNS}
              rows={(data.withholdingSlips ?? []) as Row[]}
              onChange={(rows) => patch((d) => (d.withholdingSlips = rows))}
              totalKeys={["taxBase", "amount"]}
              totalLabel="Jumlah PPh Dipotong/Dipungut"
            />
          </Panel>
        </div>
      )}

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-djp-blue/15 bg-white/95 shadow-[0_-4px_20px_-8px_rgba(33,44,95,0.25)] backdrop-blur-md">
        <div className="app-container flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
              {c.paymentStatus}
            </span>
            <span className="font-heading text-lg font-extrabold tabular-nums text-djp-blue">
              {rupiah(c.balanceDue)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LinkButton href="/spt" variant="ghost" size="md">
              Kembali
            </LinkButton>
            {editable && (
              <>
                <Button
                  variant="outline"
                  onClick={save}
                  disabled={saving || submitting}
                >
                  {saving ? "Menyimpan..." : dirty ? "Simpan Konsep *" : "Simpan Konsep"}
                </Button>
                <Button onClick={submit} disabled={saving || submitting}>
                  {submitting ? "Mengirim..." : "Bayar dan Lapor"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/* ================= primitives ================= */

function Banner({ kind, children }: { kind: "ok" | "err"; children: React.ReactNode }) {
  return (
    <div
      className={`mt-5 rounded-xl border px-4 py-3.5 text-sm leading-relaxed sm:px-5 ${
        kind === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: SptStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold ${meta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-1 pb-3 text-sm font-bold tracking-wide transition ${
        active
          ? "border-djp-blue text-djp-blue"
          : "border-transparent text-[var(--text-muted)] hover:text-djp-blue"
      }`}
    >
      {children}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-djp-blue/15 bg-white shadow-sm">
      <div className="flex items-center gap-2.5 bg-djp-blue px-5 py-3.5 text-white">
        <Chevron className="h-4 w-4 shrink-0 rotate-90" />
        <h2 className="font-heading text-sm font-bold uppercase leading-snug tracking-wide text-white">
          {title}
        </h2>
      </div>
      <div className="divide-y divide-djp-blue/10">{children}</div>
    </section>
  );
}

function NumRow({
  n,
  label,
  req,
  children,
}: {
  n?: string;
  label: string;
  req?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,340px)] sm:items-center">
      <div className="flex gap-2 text-sm leading-relaxed text-[var(--text-soft)]">
        {n && (
          <span className="shrink-0 font-semibold text-[var(--text-muted)]">{n}.</span>
        )}
        <span>
          {label}
          {req && <span className="text-rose-500"> *</span>}
        </span>
      </div>
      <div className="min-w-0 sm:justify-self-end sm:w-full">{children}</div>
    </div>
  );
}

function QRow({
  n,
  label,
  req,
  value,
  onChange,
  disabled,
  hintYa,
  hintTidak,
  amount,
}: {
  n?: string;
  label: string;
  req?: boolean;
  value: YaTidak;
  onChange: (v: YaTidak) => void;
  disabled?: boolean;
  hintYa: string;
  hintTidak: string;
  amount?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,220px)] lg:items-start">
      {/* Question + the hint that explains the current answer */}
      <div className="min-w-0">
        <div className="flex gap-2 text-sm leading-relaxed text-[var(--text-soft)]">
          {n && (
            <span className="shrink-0 font-semibold text-[var(--text-muted)]">{n}.</span>
          )}
          <span>
            {label}
            {req && <span className="text-rose-500"> *</span>}
          </span>
        </div>
        <span className="mt-2 inline-flex items-start gap-2 rounded-md bg-sky-50 px-3 py-1.5 text-xs font-medium leading-relaxed text-sky-700">
          <InfoCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {value === "ya" ? hintYa : hintTidak}
        </span>
      </div>
      <div className="flex items-center gap-5 lg:h-10">
        <Radio label="Ya" checked={value === "ya"} disabled={disabled} onChange={() => onChange("ya")} />
        <Radio label="Tidak" checked={value === "tidak"} disabled={disabled} onChange={() => onChange("tidak")} />
      </div>
      <div className="min-w-0 lg:justify-self-end lg:w-full">{amount}</div>
    </div>
  );
}

function Radio({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`inline-flex select-none items-center gap-2 text-sm ${
        disabled ? "opacity-70" : "cursor-pointer"
      }`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 shrink-0 accent-djp-blue"
      />
      <span className="font-semibold text-[var(--text-soft)]">{label}</span>
    </label>
  );
}

function ReadInput({ value }: { value: string }) {
  return (
    <div className="control flex items-center truncate border border-transparent bg-[var(--surface-sunken)] font-semibold text-[var(--text-main)]">
      {value}
    </div>
  );
}

function ReadMoney({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <div
      className={`control flex items-center justify-end border border-transparent bg-[var(--surface-sunken)] tabular-nums ${
        strong ? "font-extrabold text-djp-blue" : "font-semibold text-[var(--text-main)]"
      }`}
    >
      {value.toLocaleString("id-ID")}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  disabled,
}: {
  value: number | string | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      disabled={disabled}
      placeholder="0"
      className="control border border-djp-blue/20 bg-white text-right font-bold tabular-nums text-[var(--text-main)]"
    />
  );
}

function NumInput({
  value,
  onChange,
  disabled,
}: {
  value: number | string | undefined;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      disabled={disabled}
      className="control w-20 shrink-0 border border-djp-blue/20 bg-white px-2 text-center font-semibold tabular-nums"
    />
  );
}

function Select({
  value,
  options,
  onChange,
  disabled,
  className,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`control border border-djp-blue/20 bg-white font-semibold text-[var(--text-main)] ${className ?? ""}`}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/* ---- L-1 editable table ---- */

type GroupedCol = TableCol & { group?: string };

function SubTable({
  title,
  columns,
  rows,
  editable,
  onChange,
  totalKeys,
  totalLabel,
}: {
  title: string;
  columns: GroupedCol[];
  rows: Row[];
  editable: boolean;
  onChange: (rows: Row[]) => void;
  totalKeys?: string[];
  totalLabel?: string;
}) {
  function setCell(i: number, key: string, val: string | number) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  }
  const totals = totalKeys ?? [];
  const firstTotal = columns.findIndex((c) => totals.includes(c.key));
  const grouped = columns.some((c) => c.group);
  // Leading "Tindakan" + trailing per-column cells, matching Coretax.
  const leadCols = editable ? 2 : 1;

  return (
    <div className="px-5 py-5">
      {title && (
        <div className="mb-3 rounded-md bg-djp-blue/90 px-3.5 py-2 text-xs font-bold uppercase tracking-wide text-white">
          {title}
        </div>
      )}
      {editable && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange([...rows, {}])}
            className="inline-flex h-9 items-center rounded-lg bg-djp-blue px-4 text-xs font-bold text-white transition hover:bg-djp-blue-2 active:translate-y-px"
          >
            + Tambah
          </button>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="inline-flex h-9 items-center rounded-lg border border-rose-200 bg-white px-4 text-xs font-bold text-rose-600 transition hover:bg-rose-50 active:translate-y-px"
            >
              Hapus Semua
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-djp-blue/15">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-djp-blue/5 text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
              {editable && (
                <th rowSpan={grouped ? 2 : 1} className="w-16 px-3 py-3 text-center font-bold">
                  Tindakan
                </th>
              )}
              <th rowSpan={grouped ? 2 : 1} className="w-12 px-3 py-3 text-center font-bold">
                No.
              </th>
              {groupHeaderCells(columns, grouped)}
            </tr>
            {grouped && (
              <tr className="bg-djp-blue/5 text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                {columns
                  .filter((col) => col.group)
                  .map((col) => (
                    <th
                      key={col.key}
                      className={`px-3 py-2 font-bold ${col.align === "right" ? "text-right" : ""}`}
                    >
                      {col.label}
                    </th>
                  ))}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + leadCols}
                  className="px-4 py-10 text-center text-sm text-[var(--text-muted)]"
                >
                  Tidak ada data yang ditemukan.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-t border-djp-blue/10 align-middle">
                  {editable && (
                    <td className="px-2 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                        className="mx-auto grid h-8 w-8 place-items-center rounded-lg text-lg leading-none text-rose-500 transition hover:bg-rose-50"
                        aria-label="Hapus baris"
                      >
                        ×
                      </button>
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-center text-sm text-[var(--text-muted)]">
                    {i + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-2 py-2.5">
                      {col.kind === "computed" ? (
                        <div className="px-2 text-right text-sm font-semibold tabular-nums text-djp-blue">
                          {(col.compute?.(r) ?? 0).toLocaleString("id-ID")}
                        </div>
                      ) : col.kind === "select" ? (
                        <select
                          value={String(r[col.key] ?? "")}
                          onChange={(e) => setCell(i, col.key, e.target.value)}
                          disabled={!editable}
                          className={`control control-sm border border-djp-blue/20 bg-white ${col.w ?? ""}`}
                        >
                          <option value="">Silakan Pilih</option>
                          {(col.options ?? []).map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={col.kind === "number" ? "number" : col.kind === "date" ? "date" : "text"}
                          value={String(r[col.key] ?? "")}
                          onChange={(e) =>
                            setCell(i, col.key, col.kind === "number" ? Number(e.target.value) : e.target.value)
                          }
                          disabled={!editable}
                          className={`control control-sm border border-djp-blue/20 bg-white ${
                            col.align === "right" ? "text-right font-semibold tabular-nums" : ""
                          } ${col.w ?? ""}`}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {firstTotal >= 0 && (
            <tfoot>
              <tr className="border-t-2 border-djp-blue/15 bg-djp-blue/5">
                <td
                  colSpan={leadCols + firstTotal}
                  className="px-3 py-3 text-right text-xs font-extrabold uppercase tracking-wide text-djp-blue"
                >
                  {totalLabel ?? "Jumlah"}
                </td>
                {columns.slice(firstTotal).map((col) => (
                  <td
                    key={col.key}
                    className="px-3 py-3 text-right text-sm font-extrabold tabular-nums text-djp-blue"
                  >
                    {totals.includes(col.key)
                      ? rows
                          .reduce((sum, r) => sum + Number(r[col.key] || 0), 0)
                          .toLocaleString("id-ID")
                      : null}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/** First header row: grouped columns collapse into a spanning cell. */
function groupHeaderCells(columns: GroupedCol[], grouped: boolean) {
  const cells: ReactElement[] = [];
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (!col.group) {
      cells.push(
        <th
          key={col.key}
          rowSpan={grouped ? 2 : 1}
          className={`px-3 py-3 font-bold ${col.align === "right" ? "text-right" : ""}`}
        >
          {col.label}
        </th>,
      );
      continue;
    }
    let span = 1;
    while (i + span < columns.length && columns[i + span].group === col.group) span++;
    cells.push(
      <th key={col.group} colSpan={span} className="px-3 py-3 text-center font-bold">
        {col.group}
      </th>,
    );
    i += span - 1;
  }
  return cells;
}
