"use client";

import { useMemo, useState } from "react";
import {
  formatDate,
  rupiah,
  STATUS_META,
  type SptReturn,
  type SptStatus,
} from "../_lib/spt";
import { ArrowRight, Check, ShieldX } from "../_components/icons";
import { Button, LinkButton } from "../_components/ui";

const ADMIN_TABS: { key: SptStatus | "ALL"; label: string }[] = [
  { key: "WAITING_PAYMENT", label: "Menunggu Pembayaran" },
  { key: "REPORTED", label: "Dilaporkan" },
  { key: "REJECTED", label: "Ditolak" },
  { key: "ALL", label: "Semua" },
];

export function AdminDashboard({
  initialReturns,
}: {
  initialReturns: SptReturn[];
}) {
  const [returns, setReturns] = useState<SptReturn[]>(initialReturns);
  const [tab, setTab] = useState<SptStatus | "ALL">("WAITING_PAYMENT");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<SptReturn | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: returns.length };
    for (const r of returns) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [returns]);

  const filtered = useMemo(
    () => (tab === "ALL" ? returns : returns.filter((r) => r.status === tab)),
    [returns, tab],
  );

  function replace(updated: SptReturn) {
    setReturns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function approve(r: SptReturn) {
    setBusyId(r.id);
    setError(null);
    try {
      const res = await fetch(`/api/be/spt/${r.id}/approve`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Gagal menyetujui SPT.");
      replace((await res.json()) as SptReturn);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(r: SptReturn, reason: string) {
    setBusyId(r.id);
    setError(null);
    try {
      const res = await fetch(`/api/be/spt/${r.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Gagal menolak SPT.");
      replace((await res.json()) as SptReturn);
      setRejecting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="app-container flex-1 py-10 sm:py-12">
      <span className="inline-flex items-center gap-2 rounded-full border border-djp-blue/20 bg-djp-blue/5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-djp-blue">
        Panel Petugas Pajak
      </span>
      <h1 className="mt-4 font-heading text-2xl font-extrabold text-djp-blue sm:text-3xl">
        Peninjauan SPT Tahunan
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-soft)] sm:text-base">
        Tinjau SPT yang dikirim Wajib Pajak, lalu setujui (Dilaporkan) atau tolak
        dengan alasan.
      </p>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-semibold leading-relaxed text-rose-700 sm:px-5">
          {error}
        </div>
      )}

      <div className="mt-9 flex flex-wrap gap-2.5">
        {ADMIN_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex h-10 items-center gap-2 rounded-lg border px-5 text-xs font-bold transition sm:text-sm ${
              tab === t.key
                ? "border-djp-blue bg-djp-blue text-white"
                : "border-djp-blue/15 bg-white text-djp-blue hover:bg-djp-blue/5"
            }`}
          >
            {t.label}
            <span
              className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
                tab === t.key
                  ? "bg-white/25 text-white"
                  : "bg-djp-blue/10 text-djp-blue"
              }`}
            >
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-djp-blue/20 bg-white px-6 py-14 text-center text-sm text-[var(--text-muted)] sm:py-20">
            Tidak ada SPT pada status ini.
          </div>
        ) : (
          filtered.map((r) => (
            <AdminCard
              key={r.id}
              r={r}
              busy={busyId === r.id}
              onApprove={() => approve(r)}
              onReject={() => setRejecting(r)}
            />
          ))
        )}
      </div>

      {rejecting && (
        <RejectModal
          r={rejecting}
          busy={busyId === rejecting.id}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => reject(rejecting, reason)}
        />
      )}
    </main>
  );
}

function AdminCard({
  r,
  busy,
  onApprove,
  onReject,
}: {
  r: SptReturn;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const meta = STATUS_META[r.status];
  const pending = r.status === "WAITING_PAYMENT";
  return (
    <div className="rounded-2xl border border-djp-blue/10 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="font-heading text-base font-extrabold text-djp-blue sm:text-lg">
              {r.taxpayer_name ?? "Wajib Pajak"}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${meta.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>
          <div className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            NPWP {r.taxpayer_npwp ?? "-"} · SPT {r.form_type} · TP {r.tax_year}
          </div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Dikirim {formatDate(r.submitted_at)}
          </div>
        </div>
        <div className="shrink-0 text-left leading-tight sm:text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {r.payment_status ?? "-"}
          </div>
          <div className="mt-1 font-heading text-lg font-extrabold tabular-nums text-djp-blue sm:text-xl">
            {rupiah(r.balance_due)}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-[var(--surface-sunken)] p-4 md:grid-cols-4 md:p-5">
        <Mini label="Penghasilan Neto" value={r.computed.totalNet} />
        <Mini label="PKP" value={r.computed.taxableIncome} />
        <Mini label="PPh Terutang" value={r.computed.pphOwed} />
        <Mini label="Kredit Pajak" value={r.computed.pphCredit} />
      </div>

      {r.status === "REJECTED" && r.rejection_reason && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-rose-700">
          Alasan penolakan: {r.rejection_reason}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        <LinkButton href={`/spt/${r.id}`} variant="outline" size="md">
          Lihat Detail
          <ArrowRight className="h-4 w-4" />
        </LinkButton>
        {pending && (
          <>
            <Button variant="danger-outline" onClick={onReject} disabled={busy}>
              <ShieldX className="h-4 w-4" />
              Tolak
            </Button>
            <Button variant="success" onClick={onApprove} disabled={busy}>
              <Check className="h-4 w-4" />
              {busy ? "Memproses..." : "Setujui (Laporkan)"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold tabular-nums text-djp-blue">
        {rupiah(value)}
      </div>
    </div>
  );
}

function RejectModal({
  r,
  busy,
  onClose,
  onConfirm,
}: {
  r: SptReturn;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <h2 className="font-heading text-xl font-extrabold text-djp-blue">
          Tolak SPT
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
          {r.taxpayer_name} · SPT {r.form_type} {r.tax_year}
        </p>
        <label className="mt-6 block text-sm font-bold text-djp-blue">
          Alasan penolakan
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Contoh: Penghasilan neto tidak sesuai bukti potong 1721-A1."
            className="mt-2 w-full resize-none rounded-lg border border-djp-blue/20 bg-white px-3.5 py-3 text-sm leading-relaxed outline-none transition focus:border-djp-blue focus:shadow-[0_0_0_3px_rgba(33,44,95,0.12)]"
          />
        </label>
        <div className="mt-7 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={() => onConfirm(reason.trim())}
            disabled={busy || reason.trim().length === 0}
          >
            {busy ? "Memproses..." : "Tolak SPT"}
          </Button>
        </div>
      </div>
    </div>
  );
}
