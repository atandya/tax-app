"use client";

import { useMemo, useState } from "react";
import {
  formatDate,
  rupiah,
  type SptReturn,
  type SptStatus,
} from "../_lib/spt";
import { useLang } from "../_components/lang";
import { StatusBadge } from "../_components/status-badge";
import { Button, LinkButton, Modal, Notice } from "../_components/ui";

const ADMIN_TABS: (SptStatus | "ALL")[] = [
  "WAITING_PAYMENT",
  "REPORTED",
  "REJECTED",
  "ALL",
];

export function AdminDashboard({
  initialReturns,
}: {
  initialReturns: SptReturn[];
}) {
  const { t } = useLang();
  const [returns, setReturns] = useState<SptReturn[]>(initialReturns);
  const [tab, setTab] = useState<SptStatus | "ALL">("WAITING_PAYMENT");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<SptReturn | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tabLabel: Record<SptStatus | "ALL", string> = {
    DRAFT: t.statusDraft,
    WAITING_PAYMENT: t.statusWaiting,
    REPORTED: t.statusReported,
    REJECTED: t.statusRejected,
    ALL: t.tabAll,
  };

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
      if (!res.ok) throw new Error(t.errApprove);
      replace((await res.json()) as SptReturn);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
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
      if (!res.ok) throw new Error(t.errReject);
      replace((await res.json()) as SptReturn);
      setRejecting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="shell flex-1 py-xl">
      <span className="type-label-sm inline-flex items-center rounded-full border border-border bg-tertiary px-md py-xs text-primary">
        {t.adminBadge}
      </span>
      <h1 className="type-headline-lg mt-md text-on-neutral">{t.adminTitle}</h1>
      <p className="type-body-md measure mt-sm text-muted">{t.adminSubtitle}</p>

      {error && (
        <div className="mt-lg">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      <div className="mt-xl flex flex-wrap gap-sm">
        {ADMIN_TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`type-label-md inline-flex h-9 items-center gap-sm rounded-full border px-md transition ${
              tab === key
                ? "border-primary bg-primary text-on-primary"
                : "border-border bg-neutral text-on-neutral hover:bg-tertiary"
            }`}
          >
            {tabLabel[key]}
            <span className="tabular-nums opacity-70">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="mt-lg flex flex-col gap-md">
        {filtered.length === 0 ? (
          <p className="type-body-sm rounded-md border border-border bg-surface px-lg py-xl text-center text-muted">
            {t.emptyFiltered}
          </p>
        ) : (
          filtered.map((r) => (
            <ReviewCard
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

function ReviewCard({
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
  const { t } = useLang();
  const pending = r.status === "WAITING_PAYMENT";

  return (
    <article className="card">
      <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="type-headline-sm text-on-neutral">
              {r.taxpayer_name ?? t.adminTaxpayer}
            </h2>
            <StatusBadge status={r.status} />
          </div>
          <p className="type-body-sm mt-xs text-muted">
            NPWP {r.taxpayer_npwp ?? "—"} · SPT {r.form_type} · {t.taxYear} {r.tax_year}
          </p>
          <p className="type-body-sm text-muted">
            {t.submittedAt} {formatDate(r.submitted_at)}
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="type-label-sm text-muted">{r.payment_status ?? "—"}</p>
          <p className="type-headline-sm tabular-nums text-on-neutral">
            {rupiah(r.balance_due)}
          </p>
        </div>
      </div>

      <hr className="divider my-md" />

      <dl className="grid grid-cols-2 gap-md md:grid-cols-4">
        <Figure label={t.netIncome} value={r.computed.totalNet} />
        <Figure label={t.taxableIncomeShort} value={r.computed.taxableIncome} />
        <Figure label={t.taxOwedShort} value={r.computed.pphOwed} />
        <Figure label={t.taxCreditShort} value={r.computed.pphCredit} />
      </dl>

      {r.status === "REJECTED" && r.rejection_reason && (
        <p className="type-body-sm mt-md rounded-sm border border-error bg-error-tint px-md py-sm text-error">
          {t.rejectedLabel}: {r.rejection_reason}
        </p>
      )}

      <div className="mt-lg flex flex-wrap items-center justify-end gap-sm">
        <LinkButton href={`/spt/${r.id}`} variant="ghost">
          {t.viewDetail}
        </LinkButton>
        {pending && (
          <>
            <Button variant="danger-outline" onClick={onReject} disabled={busy}>
              {t.reject}
            </Button>
            <Button onClick={onApprove} disabled={busy}>
              {busy ? t.processing : t.approve}
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="type-label-sm text-muted">{label}</dt>
      <dd className="type-body-md mt-xs tabular-nums text-on-neutral">
        {rupiah(value)}
      </dd>
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
  const { t } = useLang();
  const [reason, setReason] = useState("");

  return (
    <Modal
      title={t.rejectModalTitle}
      subtitle={`${r.taxpayer_name} · SPT ${r.form_type} ${r.tax_year}`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-sm">
        <label htmlFor="reject-reason" className="type-label-md text-on-neutral">
          {t.rejectReasonLabel}
        </label>
        <textarea
          id="reject-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder={t.rejectReasonPlaceholder}
          className="control"
        />
        <p className="helper">{t.rejectReasonHelper}</p>
      </div>

      <div className="mt-lg flex justify-end gap-sm">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {t.cancel}
        </Button>
        <Button
          variant="danger"
          onClick={() => onConfirm(reason.trim())}
          disabled={busy || reason.trim().length === 0}
        >
          {busy ? t.processing : t.reject}
        </Button>
      </div>
    </Modal>
  );
}
