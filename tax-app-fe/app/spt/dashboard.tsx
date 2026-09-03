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
  STATUS_ORDER,
  SUPPORTED_FORM_TYPE,
  SUPPORTED_TAX_YEARS,
  type SptReturn,
  type SptStatus,
  type SupportedTaxYear,
} from "../_lib/spt";
import { postSptDraft } from "../_lib/spt-api";
import { useLang } from "../_components/lang";
import { StatusBadge } from "../_components/status-badge";
import { Button, LinkButton, Modal, Notice } from "../_components/ui";
import { useDashboardTools } from "./use-dashboard-tools";

export function SptDashboard({
  me,
  initialReturns,
}: {
  me: Me;
  initialReturns: SptReturn[];
}) {
  const router = useRouter();
  const { t } = useLang();
  const [returns, setReturns] = useState<SptReturn[]>(initialReturns);
  const [tab, setTab] = useState<SptStatus | "ALL">("ALL");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusLabel: Record<SptStatus, string> = {
    DRAFT: t.statusDraft,
    WAITING_PAYMENT: t.statusWaiting,
    REPORTED: t.statusReported,
    REJECTED: t.statusRejected,
  };

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
      setError(e instanceof Error ? e.message : t.errGeneric);
      setCreating(false);
      setShowCreate(false);
    }
  }

  async function remove(id: string) {
    if (!confirm(t.confirmDelete)) return;
    const res = await fetch(`/api/be/spt/${id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (res.ok) setReturns((prev) => prev.filter((r) => r.id !== id));
    else setError(t.errDelete);
  }

  const firstName = me.name.split(" ")[0];

  return (
    <>
      {/* Main-menu header — the second and last dark green surface in the
          product. It anchors the brand before the light form pages. */}
      <section className="bg-secondary py-2xl text-on-secondary">
        <div className="shell">
          <p className="type-body-md text-white/70">
            {t.menuGreeting}, {firstName}
          </p>
          <h1 className="type-headline-lg mt-xs">{t.menuHeadline}</h1>
          <p className="type-body-md measure mt-md text-white/80">
            {t.menuSubtitle}
          </p>
        </div>
      </section>

      <main className="shell flex-1 py-xl">
        {/* Service tiles. Everything beyond the annual return is out of scope
            for the prototype but stays visible, so the broader service
            context is legible without pretending it works. */}
        <div className="grid gap-lg sm:grid-cols-2 lg:grid-cols-3">
          <ServiceTile
            title={t.serviceAnnualTitle}
            desc={t.serviceAnnualDesc}
            action={t.serviceAnnualAction}
            onClick={() => setShowCreate(true)}
          />
          {[
            [t.servicePeriodicTitle, t.servicePeriodicDesc],
            [t.serviceBillingTitle, t.serviceBillingDesc],
            [t.serviceWithholdingTitle, t.serviceWithholdingDesc],
            [t.serviceProfileTitle, t.serviceProfileDesc],
          ].map(([title, desc]) => (
            <ServiceTile key={title} title={title} desc={desc} disabled soon={t.serviceSoon} />
          ))}
        </div>

        <hr className="divider my-xl" />

        <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="type-headline-md text-on-neutral">{t.returnsTitle}</h2>
            <p className="helper mt-xs">{t.returnsSubtitle}</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>{t.createReturn}</Button>
        </div>

        {error && (
          <div className="mt-md">
            <Notice kind="error">{error}</Notice>
          </div>
        )}

        <div className="mt-lg flex flex-wrap gap-sm">
          <Tab
            label={t.tabAll}
            count={counts.ALL}
            active={tab === "ALL"}
            onClick={() => setTab("ALL")}
          />
          {STATUS_ORDER.map((s) => (
            <Tab
              key={s}
              label={statusLabel[s]}
              count={counts[s] ?? 0}
              active={tab === s}
              onClick={() => setTab(s)}
            />
          ))}
        </div>

        <div className="mt-lg flex flex-col gap-md">
          {filtered.length === 0 ? (
            <p className="rounded-md border border-border bg-surface px-lg py-xl text-center type-body-sm text-muted">
              {tab === "ALL" ? t.emptyAll : t.emptyFiltered}
            </p>
          ) : (
            filtered.map((r) => (
              <ReturnRow key={r.id} r={r} onDelete={() => remove(r.id)} />
            ))
          )}
        </div>
      </main>

      {showCreate && (
        <CreateModal
          busy={creating}
          onClose={() => setShowCreate(false)}
          onCreate={createDraft}
        />
      )}
    </>
  );
}

/**
 * Service selection tile. Larger rounding than a content card, per the main
 * menu spec; hover shifts the border to primary and tints the surface.
 */
function ServiceTile({
  title,
  desc,
  action,
  onClick,
  disabled,
  soon,
}: {
  title: string;
  desc: string;
  action?: string;
  onClick?: () => void;
  disabled?: boolean;
  soon?: string;
}) {
  if (disabled) {
    return (
      <div
        className="card card-tile pointer-events-none opacity-40"
        aria-disabled="true"
      >
        <h3 className="type-headline-sm text-on-neutral">{title}</h3>
        <p className="type-body-sm measure-narrow mt-sm text-muted">{desc}</p>
        <p className="type-label-sm mt-md text-muted">{soon}</p>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-tile text-left transition hover:border-primary hover:bg-tertiary"
    >
      <h3 className="type-headline-sm text-on-neutral">{title}</h3>
      <p className="type-body-sm measure-narrow mt-sm text-muted">{desc}</p>
      <span className="type-label-md mt-md inline-block text-primary">{action}</span>
    </button>
  );
}

function Tab({
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
      aria-pressed={active}
      className={`type-label-md inline-flex h-9 items-center gap-sm rounded-full border px-md transition ${
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-border bg-neutral text-on-neutral hover:bg-tertiary"
      }`}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function ReturnRow({ r, onDelete }: { r: SptReturn; onDelete: () => void }) {
  const { t } = useLang();
  const isDraftLike = r.status === "DRAFT" || r.status === "REJECTED";
  return (
    <article className="card flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-sm">
          <h3 className="type-headline-sm text-on-neutral">
            SPT {r.form_type}
          </h3>
          <span className="type-body-sm text-muted">
            {t.taxYear} {r.tax_year}
          </span>
          <StatusBadge status={r.status} />
        </div>
        <p className="type-body-sm mt-sm text-muted">
          {t.updatedAt} {formatDate(r.updated_at)}
          {r.payment_status ? ` · ${r.payment_status} ${rupiah(r.balance_due)}` : ""}
        </p>
        {r.status === "REJECTED" && r.rejection_reason && (
          <p className="type-body-sm mt-sm rounded-sm border border-error bg-error-tint px-md py-sm text-error">
            {t.rejectedLabel}: {r.rejection_reason}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-sm">
        {r.status === "DRAFT" && (
          <Button variant="ghost" size="sm" onClick={onDelete}>
            {t.deleteDraft}
          </Button>
        )}
        <LinkButton href={`/spt/${r.id}`} variant={isDraftLike ? "primary" : "secondary"}>
          {isDraftLike ? t.fillReturn : t.viewReturn}
        </LinkButton>
      </div>
    </article>
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
  const { t } = useLang();
  const [year, setYear] = useState<SupportedTaxYear>(CURRENT_TAX_YEAR);
  const [formType, setFormType] = useState(SUPPORTED_FORM_TYPE);

  return (
    <Modal title={t.createModalTitle} subtitle={t.createModalSubtitle} onClose={onClose}>
      <div className="flex flex-col gap-md">
        <div className="flex flex-col gap-sm">
          <label htmlFor="create-year" className="type-label-md text-on-neutral">
            {t.taxYearLabel}
          </label>
          <select
            id="create-year"
            value={year}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (isSupportedTaxYear(next)) setYear(next);
            }}
            className="control"
          >
            {SUPPORTED_TAX_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-sm">
          <label htmlFor="create-form" className="type-label-md text-on-neutral">
            {t.formTypeLabel}
          </label>
          <select
            id="create-form"
            value={formType}
            onChange={(e) => setFormType(e.target.value)}
            className="control"
          >
            {FORM_TYPES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-lg flex justify-end gap-sm">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {t.cancel}
        </Button>
        <Button onClick={() => onCreate(year, formType)} disabled={busy}>
          {busy ? t.creating : t.createAndFill}
        </Button>
      </div>
    </Modal>
  );
}
