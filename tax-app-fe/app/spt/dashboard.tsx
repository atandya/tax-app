"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Me } from "../_lib/session";
import {
  CURRENT_TAX_YEAR,
  FORM_TYPES,
  formatDate,
  isSupportedTaxYear,
  rupiah,
  STATUS_META,
  STATUS_ORDER,
  SUPPORTED_FORM_TYPE,
  SUPPORTED_TAX_YEARS,
  type SptReturn,
  type SptStatus,
  type SupportedTaxYear,
} from "../_lib/spt";
import { postSptDraft } from "../_lib/spt-api";
import { ArrowRight, DocCheck } from "../_components/icons";
import { Button, LinkButton } from "../_components/ui";
import { useDashboardTools } from "./use-dashboard-tools";

export function SptDashboard({
  me,
  initialReturns,
}: {
  me: Me;
  initialReturns: SptReturn[];
}) {
  const router = useRouter();
  const [returns, setReturns] = useState<SptReturn[]>(initialReturns);
  const [tab, setTab] = useState<SptStatus | "ALL">("ALL");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: returns.length };
    for (const s of STATUS_ORDER) c[s] = 0;
    for (const r of returns) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [returns]);

  const filtered = useMemo(
    () => (tab === "ALL" ? returns : returns.filter((r) => r.status === tab)),
    [returns, tab],
  );

  // WebMCP: the create tool shares the manual request path and the manual
  // list state, then navigates through the agent helper in the hook.
  const createDraftForAgent = useCallback(async (taxYear: SupportedTaxYear) => {
    const created = await postSptDraft(taxYear, SUPPORTED_FORM_TYPE);
    setReturns((prev) => [created, ...prev]);
    return created;
  }, []);
  useDashboardTools({ router, returns, createDraftForAgent });

  async function createDraft(taxYear: number, formType: string) {
    setCreating(true);
    setError(null);
    try {
      const created = await postSptDraft(taxYear, formType);
      setReturns((prev) => [created, ...prev]);
      router.push(`/spt/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setCreating(false);
      setShowCreate(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus konsep SPT ini? Tindakan ini tidak dapat dibatalkan."))
      return;
    const res = await fetch(`/api/be/spt/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.ok) setReturns((prev) => prev.filter((r) => r.id !== id));
    else setError("Gagal menghapus konsep.");
  }

  return (
    <main className="app-container flex-1 py-10 sm:py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-djp-gold/30 bg-djp-gold/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[#9a6b00]">
            Surat Pemberitahuan (SPT)
          </span>
          <h1 className="mt-4 font-heading text-2xl font-extrabold text-djp-blue sm:text-3xl">
            SPT Tahunan Saya
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-soft)] sm:text-base">
            Halo {me.name.split(" ")[0]}, kelola dan laporkan SPT Tahunan PPh
            Orang Pribadi Anda.
          </p>
        </div>
        <Button size="lg" onClick={() => setShowCreate(true)} className="shrink-0">
          <DocCheck className="h-4 w-4" />
          Buat SPT
        </Button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-semibold leading-relaxed text-rose-700 sm:px-5">
          {error}
        </div>
      )}

      {/* Status tabs */}
      <div className="mt-9 flex flex-wrap gap-2.5">
        <TabButton
          label="Semua"
          count={counts.ALL}
          active={tab === "ALL"}
          onClick={() => setTab("ALL")}
        />
        {STATUS_ORDER.map((s) => (
          <TabButton
            key={s}
            label={STATUS_META[s].label}
            count={counts[s] ?? 0}
            active={tab === s}
            onClick={() => setTab(s)}
          />
        ))}
      </div>

      {/* List */}
      <div className="mt-6 space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-djp-blue/20 bg-white px-6 py-14 text-center sm:py-20">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-djp-blue/5 text-djp-blue">
              <DocCheck className="h-7 w-7" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {tab === "ALL"
                ? "Belum ada SPT. Klik “Buat SPT” untuk memulai."
                : "Tidak ada SPT pada status ini."}
            </p>
          </div>
        ) : (
          filtered.map((r) => (
            <SptCard key={r.id} r={r} onDelete={() => remove(r.id)} />
          ))
        )}
      </div>

      {showCreate && (
        <CreateModal
          busy={creating}
          onClose={() => setShowCreate(false)}
          onCreate={createDraft}
        />
      )}
    </main>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 rounded-lg border px-5 text-xs font-bold transition sm:text-sm ${
        active
          ? "border-djp-blue bg-djp-blue text-white"
          : "border-djp-blue/15 bg-white text-djp-blue hover:bg-djp-blue/5"
      }`}
    >
      {label}
      <span
        className={`grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums ${
          active ? "bg-white/25 text-white" : "bg-djp-blue/10 text-djp-blue"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function SptCard({ r, onDelete }: { r: SptReturn; onDelete: () => void }) {
  const meta = STATUS_META[r.status];
  const isDraftLike = r.status === "DRAFT" || r.status === "REJECTED";
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-djp-blue/10 bg-white p-5 shadow-sm transition hover:border-djp-blue/25 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-djp-blue/5 text-djp-blue">
          <DocCheck className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-heading text-base font-extrabold text-djp-blue sm:text-lg">
              SPT {r.form_type}
            </span>
            <span className="text-xs font-semibold text-[var(--text-muted)] sm:text-sm">
              Tahun Pajak {r.tax_year}
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${meta.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            {r.payment_status && (
              <span className="text-xs font-semibold text-[var(--text-muted)]">
                {r.payment_status} · {rupiah(r.balance_due)}
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Diperbarui {formatDate(r.updated_at)}
          </div>
          {r.status === "REJECTED" && r.rejection_reason && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-rose-700">
              Ditolak: {r.rejection_reason}
            </div>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 self-stretch sm:self-center">
        {r.status === "DRAFT" && (
          <Button variant="danger-outline" size="sm" onClick={onDelete}>
            Hapus
          </Button>
        )}
        <LinkButton href={`/spt/${r.id}`} size="md" className="flex-1 sm:flex-none">
          {isDraftLike ? "Isi SPT" : "Lihat"}
          <ArrowRight className="h-4 w-4" />
        </LinkButton>
      </div>
    </div>
  );
}

function CreateModal({
  busy,
  onClose,
  onCreate,
}: {
  busy: boolean;
  onClose: () => void;
  onCreate: (taxYear: number, formType: string) => void;
}) {
  const [year, setYear] = useState<SupportedTaxYear>(CURRENT_TAX_YEAR);
  const [formType, setFormType] = useState(SUPPORTED_FORM_TYPE);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <h2 className="font-heading text-xl font-extrabold text-djp-blue">
          Buat SPT Tahunan
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
          Pilih tahun pajak dan jenis formulir.
        </p>

        <label className="mt-7 block text-sm font-bold text-djp-blue">
          Tahun Pajak
          <select
            value={year}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (isSupportedTaxYear(next)) setYear(next);
            }}
            className="control mt-2 border border-djp-blue/20 bg-white font-semibold text-[var(--text-main)]"
          >
            {SUPPORTED_TAX_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-5 block text-sm font-bold text-djp-blue">
          Jenis Formulir
          <select
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
            className="control mt-2 border border-djp-blue/20 bg-white font-semibold text-[var(--text-main)]"
          >
            {FORM_TYPES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button onClick={() => onCreate(year, formType)} disabled={busy}>
            {busy ? "Membuat..." : "Buat & Isi"}
          </Button>
        </div>
      </div>
    </div>
  );
}
