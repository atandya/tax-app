"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
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
  sumAssets,
  UTANG_COLUMNS,
  type SptData,
  type SptReturn,
  type TableCol,
  type YaTidak,
} from "../../_lib/spt";
import { sptText, term, type SectionKey } from "../../_lib/i18n-spt";
import { filingProfileFromPtkp, isFilingProfile } from "../../_lib/filing-profile";
import { putSptData } from "../../_lib/spt-api";
import { useLang } from "../../_components/lang";
import { StatusBadge } from "../../_components/status-badge";
import { Button, Choice, LinkButton, Notice } from "../../_components/ui";
import { useTaxReturnTools } from "./use-tax-return-tools";

type Tab = "induk" | "l1";
type Row = Record<string, string | number | undefined>;

/** Order the guide panel walks through, per tab. */
const INDUK_SECTIONS: SectionKey[] = [
  "header",
  "identity",
  "income",
  "tax",
  "credits",
  "balance",
  "amendment",
  "refund",
  "installment",
  "other",
  "attachments",
  "declaration",
];
const L1_SECTIONS: SectionKey[] = [
  "assets",
  "debts",
  "family",
  "employment",
  "withholding",
];

export function SptForm({ me, initial }: { me: Me; initial: SptReturn }) {
  const router = useRouter();
  const { lang, t: app } = useLang();
  const t = sptText[lang];

  const [spt, setSpt] = useState<SptReturn>(initial);
  const [data, setData] = useState<SptData>(initial.data ?? {});
  const [tab, setTab] = useState<Tab>("induk");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // Which guide card the sidebar shows. It follows the section the cursor or
  // keyboard focus last entered and never resets on leave, so the card stays
  // put while the reader moves into the panel to read it.
  const [guide, setGuide] = useState<SectionKey>("header");

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
    // Neto is derived (bruto − pengurangan), exactly as the backend computes it.
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
  // Persist an explicit next state (not the render closure's `data`) and
  // adopt the backend's canonical response. Shared by the manual Save button
  // and the WebMCP write tool so both see the same saved return.
  const returnId = initial.id;
  const persistSptData = useCallback(
    async (nextData: SptData): Promise<SptReturn> => {
      try {
        const updated = await putSptData(returnId, nextData);
        setSpt(updated);
        setData(updated.data ?? {});
        setDirty(false);
        return updated;
      } catch (e) {
        // Keep the previous canonical state; surface the existing banner.
        setMsg({
          kind: "err",
          text: e instanceof Error ? e.message : app.errGeneric,
        });
        throw e;
      }
    },
    [returnId, app.errGeneric],
  );

  // WebMCP: after the assistant's update is persisted, show the Induk PTKP
  // row that React re-rendered from the canonical response. No DOM writes.
  const showIndukPtkpUpdate = useCallback(
    (saved: SptReturn) => {
      const code = saved.data?.identity?.ptkp ?? "-";
      setTab("induk");
      setGuide("tax");
      setMsg({ kind: "ok", text: t.msgAgentPtkp(code) });
      window.setTimeout(() => {
        document
          .getElementById("spt-ptkp")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    },
    [t],
  );
  useTaxReturnTools({ spt, data, persistSptData, showIndukPtkpUpdate });

  async function save(): Promise<SptReturn | null> {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await persistSptData(data);
      setMsg({ kind: "ok", text: t.msgSaved });
      return updated;
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : app.errGeneric });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!data.declarationAgree) {
      setMsg({ kind: "err", text: t.msgDeclarationRequired });
      setTab("induk");
      setGuide("declaration");
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
        throw new Error(b?.message ?? app.errGeneric);
      }
      const updated = (await res.json()) as SptReturn;
      setSpt(updated);
      setMsg({ kind: "ok", text: t.msgSubmitted });
      router.refresh();
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : app.errGeneric });
    } finally {
      setSubmitting(false);
    }
  }

  const npwp = spt.taxpayer_npwp ?? me.npwp ?? "—";
  const name = spt.taxpayer_name ?? me.name;
  const sections = tab === "induk" ? INDUK_SECTIONS : L1_SECTIONS;

  /** Props every section carries so entering it swaps the guide card. */
  const focus = (key: SectionKey) => ({
    onMouseEnter: () => setGuide(key),
    onFocusCapture: () => setGuide(key),
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* Title band */}
      <div className="border-b border-border bg-neutral">
        <div className="shell py-lg">
          <nav className="type-body-sm flex flex-wrap items-center gap-sm text-muted">
            <Link href="/spt" className="text-primary hover:underline">
              {t.breadcrumbReturns}
            </Link>
            <span aria-hidden>/</span>
            <span>
              {app.taxYear} {spt.tax_year}
            </span>
          </nav>
          <div className="mt-sm flex flex-wrap items-center justify-between gap-md">
            <h1 className="type-headline-lg measure text-on-neutral">{t.pageTitle}</h1>
            <StatusBadge status={spt.status} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row lg:items-start">
        {/* Guide panel — fixed 320px column on `surface`, separated from the
            form by a single vertical rule. */}
        <aside className="shrink-0 border-b border-border bg-surface lg:sticky lg:top-[calc(var(--disclaimer-h)+var(--nav-h))] lg:w-[var(--guide-w)] lg:self-start lg:border-b-0 lg:border-r lg:max-h-[calc(100vh-var(--disclaimer-h)-var(--nav-h))] lg:overflow-y-auto">
          <div className="p-lg">
            <h2 className="type-headline-sm text-on-surface">{t.guideTitle}</h2>
            <p className="type-body-sm measure-narrow mt-xs text-muted">
              {t.guideIntro}
            </p>
            <div className="mt-lg">
              <GuideCardView section={guide} lang={lang} />
            </div>

            {/* Section index — clicking one both scrolls to it and pins its
                guide card, which is how a keyboard user reaches the panel. */}
            <nav className="mt-lg flex flex-col gap-xs">
              {sections.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setGuide(key);
                    document
                      .getElementById(`section-${key}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`type-body-sm rounded-sm px-sm py-xs text-left transition ${
                    guide === key
                      ? "bg-tertiary text-primary"
                      : "text-muted hover:text-on-surface"
                  }`}
                >
                  {t.section[key]}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Form column */}
        <main className="min-w-0 flex-1 px-lg pb-2xl pt-lg sm:px-xl">
          <div className="flex items-center gap-xl border-b border-border">
            <TabBtn active={tab === "induk"} onClick={() => { setTab("induk"); setGuide("header"); }}>
              {t.tabInduk}
            </TabBtn>
            <TabBtn active={tab === "l1"} onClick={() => { setTab("l1"); setGuide("assets"); }}>
              {t.tabL1}
            </TabBtn>
          </div>

          {spt.status === "REJECTED" && spt.rejection_reason && (
            <div className="mt-lg">
              <Notice kind="error">
                {t.msgRejected} {spt.rejection_reason}
              </Notice>
            </div>
          )}
          {msg && (
            <div className="mt-lg">
              <Notice kind={msg.kind === "ok" ? "success" : "error"}>{msg.text}</Notice>
            </div>
          )}

          {tab === "induk" ? (
            <div>
              <Section id="header" title={t.section.header} {...focus("header")}>
                <FieldRow label={t.row.taxYear}>
                  <ReadValue value={String(spt.tax_year)} />
                </FieldRow>
                <FieldRow label={t.row.status}>
                  <TermSelect
                    value={data.header?.status ?? "Normal"}
                    options={HEADER_STATUS}
                    disabled={!editable}
                    lang={lang}
                    onChange={(v) => setHeader("status", v)}
                  />
                </FieldRow>
                <FieldRow label={t.row.method}>
                  <TermSelect
                    value={data.header?.method ?? "Pencatatan"}
                    options={HEADER_METHOD}
                    disabled={!editable}
                    lang={lang}
                    onChange={(v) => setHeader("method", v)}
                  />
                </FieldRow>
                <FieldRow label={t.row.period}>
                  <div className="flex items-center gap-sm">
                    <NumInput
                      value={data.header?.periodStart ?? 1}
                      disabled={!editable}
                      onChange={(v) => setHeader("periodStart", v)}
                    />
                    <span className="text-muted">—</span>
                    <NumInput
                      value={data.header?.periodEnd ?? 12}
                      disabled={!editable}
                      onChange={(v) => setHeader("periodEnd", v)}
                    />
                  </div>
                </FieldRow>
                <FieldRow label={t.row.source}>
                  <TermSelect
                    value={data.header?.source ?? "Pekerjaan"}
                    options={HEADER_SOURCE}
                    disabled={!editable}
                    lang={lang}
                    onChange={(v) => setHeader("source", v)}
                  />
                </FieldRow>
              </Section>

              <Section id="identity" title={t.section.identity} {...focus("identity")}>
                <FieldRow n="1" label={t.row.npwp} required>
                  <ReadValue value={npwp} />
                </FieldRow>
                <FieldRow n="2" label={t.row.name} required>
                  <ReadValue value={name} />
                </FieldRow>
                <FieldRow n="3" label={t.row.idType} required>
                  <ReadValue value="KTP" />
                </FieldRow>
                <FieldRow n="4" label={t.row.idNumber} required>
                  <ReadValue value={npwp} />
                </FieldRow>
                <FieldRow n="5" label={t.row.phone} required>
                  <ReadValue value={me.username} />
                </FieldRow>
                <FieldRow n="6" label={t.row.email} required>
                  <ReadValue value="—" />
                </FieldRow>
                <FieldRow n="7" label={t.row.spouseStatus}>
                  <ReadValue value={t.choose} />
                </FieldRow>
                <FieldRow n="8" label={t.row.spouseNpwp}>
                  <ReadValue value="—" />
                </FieldRow>
              </Section>

              <Section id="income" title={t.section.income} {...focus("income")}>
                <QuestionRow
                  n="1.a"
                  label={t.row.q1a}
                  required
                  value={ans("q1a")}
                  hint={t.hint.q1a}
                  t={t}
                  disabled={!editable}
                  onChange={(v) => setAns("q1a", v)}
                  amount={<ReadMoney value={data.income?.employment ?? 0} />}
                />
                <QuestionRow
                  n="1.b"
                  label={t.row.q1b}
                  required
                  value={ans("q1b")}
                  hint={t.hint.q1b}
                  t={t}
                  disabled={!editable}
                  onChange={(v) => setAns("q1b", v, () => setIncome("business", 0))}
                  amount={
                    ans("q1b") === "ya" ? (
                      <MoneyInput
                        value={data.income?.business}
                        disabled={!editable}
                        onChange={(v) => setIncome("business", v)}
                      />
                    ) : (
                      <ReadMoney value={0} />
                    )
                  }
                />
                <QuestionRow
                  n="1.c"
                  label={t.row.q1c}
                  required
                  value={ans("q1c")}
                  hint={t.hint.q1c}
                  t={t}
                  disabled={!editable}
                  onChange={(v) => setAns("q1c", v, () => setIncome("other", 0))}
                  amount={
                    ans("q1c") === "ya" ? (
                      <MoneyInput
                        value={data.income?.other}
                        disabled={!editable}
                        onChange={(v) => setIncome("other", v)}
                      />
                    ) : (
                      <ReadMoney value={0} />
                    )
                  }
                />
                <QuestionRow
                  n="1.d"
                  label={t.row.q1d}
                  required
                  value={ans("q1d")}
                  hint={t.hint.q1d}
                  t={t}
                  disabled={!editable}
                  onChange={(v) => setAns("q1d", v, () => setIncome("foreign", 0))}
                  amount={
                    ans("q1d") === "ya" ? (
                      <MoneyInput
                        value={data.income?.foreign}
                        disabled={!editable}
                        onChange={(v) => setIncome("foreign", v)}
                      />
                    ) : (
                      <ReadMoney value={0} />
                    )
                  }
                />
              </Section>

              <Section id="tax" title={t.section.tax} {...focus("tax")}>
                <FieldRow n="2" label={t.row.r2}>
                  <ReadMoney value={c.totalNet} />
                </FieldRow>
                <QuestionRow
                  n="3"
                  label={t.row.q3}
                  value={ans("q3")}
                  hint={t.hint.q3}
                  t={t}
                  disabled={!editable}
                  onChange={(v) => setAns("q3", v, () => setZakat(0))}
                  amount={
                    ans("q3") === "ya" ? (
                      <MoneyInput
                        value={data.deductions?.zakat}
                        disabled={!editable}
                        onChange={setZakat}
                      />
                    ) : (
                      <ReadMoney value={0} />
                    )
                  }
                />
                <FieldRow n="4" label={t.row.r4}>
                  <ReadMoney value={c.netAfterDeduction} />
                </FieldRow>
                <FieldRow n="5" label={t.row.r5}>
                  <div id="spt-ptkp" className="flex flex-wrap items-center gap-sm">
                    <select
                      value={data.identity?.ptkp ?? "TK/0"}
                      disabled={!editable}
                      onChange={(e) =>
                        patch((d) => {
                          // A manual PTKP choice confirms the matching facts,
                          // so manual and assistant edits mean the same thing.
                          const v = e.target.value;
                          d.identity = { ...d.identity, ptkp: v };
                          const profile = filingProfileFromPtkp(v);
                          if (profile) d.filingProfile = profile;
                          else delete d.filingProfile;
                        })
                      }
                      className="control w-28 shrink-0"
                    >
                      {PTKP_OPTIONS.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.code}
                        </option>
                      ))}
                    </select>
                    <div className="min-w-[160px] flex-1">
                      <ReadMoney value={c.ptkpAmount} />
                    </div>
                    {!isFilingProfile(data.filingProfile) && (
                      <span
                        className="type-label-sm rounded-full border border-pending/30 bg-pending-tint px-sm py-xs text-pending"
                        title={t.unconfirmedHint}
                      >
                        {t.unconfirmed}
                      </span>
                    )}
                  </div>
                </FieldRow>
                <FieldRow n="6" label={t.row.r6}>
                  <ReadMoney value={c.taxableIncome} />
                </FieldRow>
                <FieldRow n="7" label={t.row.r7}>
                  <ReadMoney value={c.pphOwed} strong />
                </FieldRow>
                <QuestionRow
                  n="8"
                  label={t.row.q8}
                  value={ans("q8")}
                  hint={t.hint.q8}
                  t={t}
                  disabled={!editable}
                  onChange={(v) => setAns("q8", v)}
                  amount={<ReadMoney value={0} />}
                />
                <FieldRow n="9" label={t.row.r9}>
                  <ReadMoney value={c.pphOwed} strong />
                </FieldRow>
              </Section>

              <Section id="credits" title={t.section.credits} {...focus("credits")}>
                <QuestionRow
                  n="10.a"
                  label={t.row.q10a}
                  required
                  value={ans("q10a")}
                  hint={t.hint.q10a}
                  t={t}
                  disabled={!editable}
                  onChange={(v) => setAns("q10a", v, () => setCredit("withholding", 0))}
                  amount={
                    ans("q10a") === "ya" ? (
                      <MoneyInput
                        value={data.credits?.withholding}
                        disabled={!editable}
                        onChange={(v) => setCredit("withholding", v)}
                      />
                    ) : (
                      <ReadMoney value={0} />
                    )
                  }
                />
                <FieldRow n="10.b" label={t.row.r10b}>
                  <MoneyInput
                    value={data.credits?.installment25}
                    disabled={!editable}
                    onChange={(v) => setCredit("installment25", v)}
                  />
                </FieldRow>
                <FieldRow n="10.c" label={t.row.r10c}>
                  <MoneyInput
                    value={data.credits?.stp25}
                    disabled={!editable}
                    onChange={(v) => setCredit("stp25", v)}
                  />
                </FieldRow>
                <QuestionRow
                  n="10.d"
                  label={t.row.q10d}
                  required
                  value={ans("q10d")}
                  hint={t.hint.q10d}
                  t={t}
                  disabled={!editable}
                  onChange={(v) => setAns("q10d", v)}
                  amount={<ReadMoney value={0} />}
                />
              </Section>

              <Section id="balance" title={t.section.balance} {...focus("balance")}>
                <FieldRow n="11.a" label={t.row.r11a}>
                  <ReadMoney value={signedBalance} strong />
                </FieldRow>
                <QuestionRow
                  n="11.b"
                  label={t.row.q11b}
                  value={ans("q11b")}
                  hint={t.hint.q11b}
                  t={t}
                  disabled={!editable}
                  onChange={(v) => setAns("q11b", v)}
                  amount={<ReadMoney value={0} />}
                />
                <FieldRow n="11.c" label={t.row.r11c}>
                  <ReadMoney value={signedBalance} strong />
                </FieldRow>
              </Section>

              <Section id="amendment" title={t.section.amendment} {...focus("amendment")}>
                <FieldRow n="12.a" label={t.row.r12a}>
                  <ReadMoney value={0} />
                </FieldRow>
                <FieldRow n="12.b" label={t.row.r12b}>
                  <ReadMoney value={0} />
                </FieldRow>
              </Section>

              <Section id="refund" title={t.section.refund} {...focus("refund")}>
                <FieldRow label={t.row.refundRequest}>
                  <ReadValue value={t.choose} />
                </FieldRow>
                <FieldRow label={t.row.accountNumber}>
                  <ReadValue value="—" />
                </FieldRow>
                <FieldRow label={t.row.bankName}>
                  <ReadValue value="—" />
                </FieldRow>
                <FieldRow label={t.row.accountHolder}>
                  <ReadValue value="—" />
                </FieldRow>
              </Section>

              <Section
                id="installment"
                title={t.section.installment}
                {...focus("installment")}
              >
                {(["q13a", "q13b", "q13c"] as const).map((key, i) => (
                  <QuestionRow
                    key={key}
                    n={`13.${"abc"[i]}`}
                    label={t.row[key]}
                    value={ans(key)}
                    hint={t.hint[key]}
                    t={t}
                    disabled={!editable}
                    onChange={(v) => setAns(key, v)}
                  />
                ))}
              </Section>

              <Section id="other" title={t.section.other} {...focus("other")}>
                <FieldRow n="14.a" label={t.row.r14a}>
                  <ReadMoney value={hartaTotals.current} />
                </FieldRow>
                {(
                  [
                    ["q14b", true],
                    ["q14c", true],
                    ["q14d", true],
                    ["q14e", false],
                    ["q14f", true],
                    ["q14g", true],
                  ] as const
                ).map(([key, required], i) => (
                  <QuestionRow
                    key={key}
                    n={`14.${"bcdefg"[i]}`}
                    label={t.row[key]}
                    required={required}
                    value={ans(key)}
                    hint={t.hint.generic}
                    t={t}
                    disabled={!editable}
                    onChange={(v) => setAns(key, v)}
                  />
                ))}
                <FieldRow n="14.h" label={t.row.r14h}>
                  <ReadMoney value={0} />
                </FieldRow>
              </Section>

              <Section
                id="attachments"
                title={t.section.attachments}
                {...focus("attachments")}
              >
                <FieldRow label={`a. ${t.row.attachA}`}>
                  <ReadValue value={t.row.attachSimple} />
                </FieldRow>
                <FieldRow label={`b. ${t.row.attachB}`}>
                  <ReadValue value={t.row.attachNone} />
                </FieldRow>
                <FieldRow label={`c. ${t.row.attachC}`}>
                  <ReadValue value={t.row.attachNone} />
                </FieldRow>
                <FieldRow label={`d. ${t.row.attachD}`}>
                  <ReadValue value={t.none} />
                </FieldRow>
                <FieldRow label={`e. ${t.row.attachE}`}>
                  <ReadValue value={t.none} />
                </FieldRow>
              </Section>

              <Section
                id="declaration"
                title={t.section.declaration}
                {...focus("declaration")}
              >
                <p className="type-body-sm text-muted">
                  {t.filingStatus}: {term(lang, c.paymentStatus)}
                </p>
                <div className="rounded-sm border border-border bg-surface p-md">
                  <Choice
                    kind="checkbox"
                    checked={!!data.declarationAgree}
                    disabled={!editable}
                    onChange={() =>
                      patch((d) => (d.declarationAgree = !d.declarationAgree))
                    }
                    label={<span className="measure block">{t.row.declaration}</span>}
                  />
                </div>
                <FieldRow label={t.row.signer}>
                  <div className="flex flex-wrap items-center gap-lg">
                    <Choice
                      kind="radio"
                      label={t.row.signerSelf}
                      checked={(data.identity?.signer ?? "wp") === "wp"}
                      disabled={!editable}
                      onChange={() =>
                        patch((d) => (d.identity = { ...d.identity, signer: "wp" }))
                      }
                    />
                    <Choice
                      kind="radio"
                      label={t.row.signerProxy}
                      checked={data.identity?.signer === "kuasa"}
                      disabled={!editable}
                      onChange={() =>
                        patch((d) => (d.identity = { ...d.identity, signer: "kuasa" }))
                      }
                    />
                  </div>
                </FieldRow>
                <FieldRow label={t.row.npwp}>
                  <ReadValue value={npwp} />
                </FieldRow>
                <FieldRow label={t.row.fullName}>
                  <ReadValue value={name} />
                </FieldRow>
              </Section>
            </div>
          ) : (
            /* ================= Lampiran I ================= */
            <div>
              <Section id="assets" title={t.section.assets} {...focus("assets")}>
                {HARTA_TABLES.map((table) => (
                  <SubTable
                    key={table.category}
                    title={term(lang, table.category)}
                    editable={editable}
                    columns={table.columns}
                    rows={(data.assets ?? []).filter(
                      (a) => a.category === table.category,
                    ) as Row[]}
                    onChange={(rows) => setCategoryAssets(table.category, rows)}
                    totalKeys={table.totalKeys}
                    totalLabel={table.totalLabel}
                    lang={lang}
                    t={t}
                  />
                ))}

                <div>
                  <h4 className="type-label-md text-on-neutral">{t.row.assetSummary}</h4>
                  <div className="scroll-x mt-sm rounded-sm border border-border">
                    <table className="w-full min-w-[480px]">
                      <thead>
                        <tr className="border-b border-border bg-surface">
                          <th className="type-label-sm px-md py-sm text-left text-muted">
                            {t.row.description}
                          </th>
                          <th className="type-label-sm w-48 px-md py-sm text-right text-muted">
                            {t.row.assetAcquisition}
                          </th>
                          <th className="type-label-sm w-48 px-md py-sm text-right text-muted">
                            {t.row.assetCurrent}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="type-body-sm px-md py-sm text-on-neutral">
                            {t.row.assetTotal}
                          </td>
                          <td className="type-label-md px-md py-sm text-right tabular-nums text-primary">
                            {hartaTotals.acquisition.toLocaleString("id-ID")}
                          </td>
                          <td className="type-label-md px-md py-sm text-right tabular-nums text-primary">
                            {hartaTotals.current.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Section>

              <Section id="debts" title={t.section.debts} {...focus("debts")}>
                <SubTable
                  editable={editable}
                  columns={UTANG_COLUMNS}
                  rows={(data.debts ?? []) as Row[]}
                  onChange={(rows) => patch((d) => (d.debts = rows))}
                  totalKeys={["balance"]}
                  totalLabel={t.row.totalDebts}
                  lang={lang}
                  t={t}
                />
              </Section>

              <Section id="family" title={t.section.family} {...focus("family")}>
                <SubTable
                  editable={editable}
                  columns={KELUARGA_COLUMNS}
                  rows={(data.family ?? []) as Row[]}
                  onChange={(rows) => patch((d) => (d.family = rows))}
                  lang={lang}
                  t={t}
                />
              </Section>

              <Section id="employment" title={t.section.employment} {...focus("employment")}>
                <SubTable
                  editable={editable}
                  columns={PEKERJAAN_COLUMNS}
                  rows={(data.employmentSlips ?? []) as Row[]}
                  onChange={setEmploymentSlips}
                  totalKeys={["gross", "deduction", "net"]}
                  totalLabel={t.row.totalEmployment}
                  lang={lang}
                  t={t}
                />
              </Section>

              <Section
                id="withholding"
                title={t.section.withholding}
                {...focus("withholding")}
              >
                <SubTable
                  editable={editable}
                  columns={BUKTI_POTONG_COLUMNS}
                  rows={(data.withholdingSlips ?? []) as Row[]}
                  onChange={(rows) => patch((d) => (d.withholdingSlips = rows))}
                  totalKeys={["taxBase", "amount"]}
                  totalLabel={t.row.totalWithholding}
                  lang={lang}
                  t={t}
                />
              </Section>
            </div>
          )}
        </main>
      </div>

      {/* Action bar — level 1 elevation, the only lifted surface on the page. */}
      <div className="elev-1 sticky bottom-0 z-30 border-t border-border bg-neutral">
        <div className="flex flex-wrap items-center justify-between gap-md px-lg py-md sm:px-xl">
          <div>
            <p className="type-label-sm text-muted">
              {term(lang, c.paymentStatus)}
              {dirty ? ` · ${t.unsavedMark}` : ""}
            </p>
            <p className="type-headline-sm tabular-nums text-on-neutral">
              {rupiah(c.balanceDue)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <LinkButton href="/spt" variant="ghost">
              {t.back}
            </LinkButton>
            {editable && (
              <>
                <Button
                  variant="secondary"
                  onClick={save}
                  disabled={saving || submitting}
                >
                  {saving ? t.saving : t.saveDraft}
                </Button>
                <Button onClick={submit} disabled={saving || submitting}>
                  {submitting ? t.submitting : t.submit}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= structure ================= */

/**
 * A form section. Not a card: sections sit directly on the page background,
 * separated by a hairline with generous vertical space. The serif heading is
 * what makes the boundary read.
 */
function Section({
  id,
  title,
  children,
  ...handlers
}: {
  id: SectionKey;
  title: string;
  children: ReactNode;
  onMouseEnter?: () => void;
  onFocusCapture?: () => void;
}) {
  return (
    <section
      id={`section-${id}`}
      {...handlers}
      className="scroll-mt-2xl border-b border-border py-xl last:border-b-0"
    >
      <h3 className="type-headline-md text-on-neutral">{title}</h3>
      <div className="mt-lg flex flex-col gap-lg">{children}</div>
    </section>
  );
}

/** Label column 180px, input column flex — one rhythm down the whole form. */
function FieldRow({
  n,
  label,
  required,
  children,
}: {
  n?: string;
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-sm sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center sm:gap-lg">
      <div className="type-label-md flex gap-xs text-on-neutral">
        {n && <span className="shrink-0 text-muted">{n}</span>}
        <span>
          {label}
          {required && <span className="text-error"> *</span>}
        </span>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * A yes/no question with the sentence that explains the current answer, and
 * an optional amount that appears once the answer is yes.
 */
function QuestionRow({
  n,
  label,
  required,
  value,
  hint,
  t,
  onChange,
  disabled,
  amount,
}: {
  n?: string;
  label: string;
  required?: boolean;
  value: YaTidak;
  hint: { yes: string; no: string };
  t: (typeof sptText)["id"];
  onChange: (v: YaTidak) => void;
  disabled?: boolean;
  amount?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-sm lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,200px)] lg:items-start lg:gap-lg">
      <div className="min-w-0">
        <p className="type-label-md flex gap-xs text-on-neutral">
          {n && <span className="shrink-0 text-muted">{n}</span>}
          <span className="measure">
            {label}
            {required && <span className="text-error"> *</span>}
          </span>
        </p>
        <p className="helper mt-xs">{value === "ya" ? hint.yes : hint.no}</p>
      </div>
      <div className="flex items-center gap-lg">
        <Choice
          kind="radio"
          label={t.yes}
          checked={value === "ya"}
          disabled={disabled}
          onChange={() => onChange("ya")}
        />
        <Choice
          kind="radio"
          label={t.no}
          checked={value === "tidak"}
          disabled={disabled}
          onChange={() => onChange("tidak")}
        />
      </div>
      <div className="min-w-0">{amount}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`type-label-md -mb-px border-b-2 pb-sm transition ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted hover:text-on-neutral"
      }`}
    >
      {children}
    </button>
  );
}

/** The guide card the panel is currently showing. */
function GuideCardView({ section, lang }: { section: SectionKey; lang: "id" | "en" }) {
  const card = sptText[lang].guide[section];
  return (
    <article className="rounded-md border border-border border-l-2 border-l-primary bg-neutral p-lg">
      <h3 className="type-headline-sm text-on-neutral">{card.title}</h3>
      <p className="type-body-md measure-narrow mt-sm text-on-surface">{card.body}</p>
      {card.points && (
        <ul className="mt-md flex flex-col gap-sm">
          {card.points.map((point) => (
            <li key={point} className="type-body-sm measure-narrow flex gap-sm text-muted">
              <span aria-hidden className="text-primary">
                ·
              </span>
              {point}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/* ================= inputs ================= */

function ReadValue({ value }: { value: string }) {
  return (
    <p className="type-body-md rounded-sm bg-surface px-md py-sm text-on-neutral">
      {value}
    </p>
  );
}

function ReadMoney({ value, strong }: { value: number; strong?: boolean }) {
  return (
    <p
      className={`rounded-sm bg-surface px-md py-sm text-right tabular-nums ${
        strong ? "type-label-md text-primary" : "type-body-md text-on-neutral"
      }`}
    >
      {value.toLocaleString("id-ID")}
    </p>
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
      className="control control-num"
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
      className="control w-20 shrink-0 px-sm text-center tabular-nums"
    />
  );
}

/** Select over a statutory vocabulary: the value stays Indonesian, only the
 *  visible option text is translated. */
function TermSelect({
  value,
  options,
  onChange,
  disabled,
  lang,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  lang: "id" | "en";
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="control"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {term(lang, o)}
        </option>
      ))}
    </select>
  );
}

/* ================= Schedule I editable table ================= */

type GroupedCol = TableCol & { group?: string };

function SubTable({
  title,
  columns,
  rows,
  editable,
  onChange,
  totalKeys,
  totalLabel,
  lang,
  t,
}: {
  title?: string;
  columns: GroupedCol[];
  rows: Row[];
  editable: boolean;
  onChange: (rows: Row[]) => void;
  totalKeys?: string[];
  totalLabel?: string;
  lang: "id" | "en";
  t: (typeof sptText)["id"];
}) {
  function setCell(i: number, key: string, val: string | number) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  }
  const totals = totalKeys ?? [];
  const firstTotal = columns.findIndex((col) => totals.includes(col.key));
  const grouped = columns.some((col) => col.group);
  // Leading "action" column when editable, plus the row-number column.
  const leadCols = editable ? 2 : 1;

  return (
    <div>
      {title && <h4 className="type-label-md text-on-neutral">{title}</h4>}
      {editable && (
        <div className="mt-sm flex flex-wrap gap-sm">
          <Button size="sm" variant="secondary" onClick={() => onChange([...rows, {}])}>
            {t.addRow}
          </Button>
          {rows.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => onChange([])}>
              {t.clearRows}
            </Button>
          )}
        </div>
      )}

      <div className="scroll-x mt-sm rounded-sm border border-border">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-surface">
              {editable && (
                <th
                  rowSpan={grouped ? 2 : 1}
                  className="type-label-sm w-16 px-sm py-sm text-center text-muted"
                >
                  {t.action}
                </th>
              )}
              <th
                rowSpan={grouped ? 2 : 1}
                className="type-label-sm w-12 px-sm py-sm text-center text-muted"
              >
                {t.rowNumber}
              </th>
              {groupHeaderCells(columns, grouped, lang)}
            </tr>
            {grouped && (
              <tr className="border-b border-border bg-surface">
                {columns
                  .filter((col) => col.group)
                  .map((col) => (
                    <th
                      key={col.key}
                      className={`type-label-sm px-sm py-sm text-muted ${
                        col.align === "right" ? "text-right" : "text-left"
                      }`}
                    >
                      {term(lang, col.label)}
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
                  className="type-body-sm px-md py-xl text-center text-muted"
                >
                  {t.noRows}
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-b border-border last:border-b-0">
                  {editable && (
                    <td className="px-sm py-xs text-center">
                      <button
                        type="button"
                        onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                        aria-label={t.removeRow}
                        className="type-body-sm px-sm text-error hover:underline"
                      >
                        {t.removeRow}
                      </button>
                    </td>
                  )}
                  <td className="type-body-sm px-sm py-xs text-center text-muted">
                    {i + 1}
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-xs py-xs">
                      {col.kind === "computed" ? (
                        <p className="type-body-sm px-sm text-right tabular-nums text-primary">
                          {(col.compute?.(r) ?? 0).toLocaleString("id-ID")}
                        </p>
                      ) : col.kind === "select" ? (
                        <select
                          value={String(r[col.key] ?? "")}
                          onChange={(e) => setCell(i, col.key, e.target.value)}
                          disabled={!editable}
                          className={`control control-sm ${col.w ?? ""}`}
                        >
                          <option value="">{t.choose}</option>
                          {(col.options ?? []).map((o) => (
                            <option key={o} value={o}>
                              {term(lang, o)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={
                            col.kind === "number"
                              ? "number"
                              : col.kind === "date"
                                ? "date"
                                : "text"
                          }
                          value={String(r[col.key] ?? "")}
                          onChange={(e) =>
                            setCell(
                              i,
                              col.key,
                              col.kind === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                            )
                          }
                          disabled={!editable}
                          className={`control control-sm ${
                            col.align === "right" ? "control-num" : ""
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
              <tr className="border-t border-border bg-surface">
                <td
                  colSpan={leadCols + firstTotal}
                  className="type-label-md px-md py-sm text-right text-on-neutral"
                >
                  {totalLabel ?? t.total}
                </td>
                {columns.slice(firstTotal).map((col) => (
                  <td
                    key={col.key}
                    className="type-label-md px-md py-sm text-right tabular-nums text-primary"
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
function groupHeaderCells(
  columns: GroupedCol[],
  grouped: boolean,
  lang: "id" | "en",
) {
  const cells: ReactElement[] = [];
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (!col.group) {
      cells.push(
        <th
          key={col.key}
          rowSpan={grouped ? 2 : 1}
          className={`type-label-sm px-sm py-sm text-muted ${
            col.align === "right" ? "text-right" : "text-left"
          }`}
        >
          {term(lang, col.label)}
        </th>,
      );
      continue;
    }
    let span = 1;
    while (i + span < columns.length && columns[i + span].group === col.group) span++;
    cells.push(
      <th
        key={col.group}
        colSpan={span}
        className="type-label-sm px-sm py-sm text-center text-muted"
      >
        {term(lang, col.group)}
      </th>,
    );
    i += span - 1;
  }
  return cells;
}
