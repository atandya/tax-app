"use client";

import { useEffect, useRef, useState } from "react";
import { Brand } from "./_components/brand";
import {
  ArrowRight,
  Chevron,
  LinkOff,
  Lock,
  LockOpen,
  Refresh,
  ShieldCheck,
  ShieldX,
  UserX,
  Wifi,
} from "./_components/icons";
import { LinkButton } from "./_components/ui";
import { translations, type Lang } from "./_lib/i18n";

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("id");
  const [langOpen, setLangOpen] = useState(false);
  const t = translations[lang];
  const langWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (langWrapRef.current && !langWrapRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const safeItems = [
    { Icon: Lock, title: t.safe1Title, desc: t.safe1Desc },
    { Icon: Refresh, title: t.safe2Title, desc: t.safe2Desc },
    { Icon: Wifi, title: t.safe3Title, desc: t.safe3Desc },
  ];
  const dangerItems = [
    { Icon: UserX, title: t.danger1Title, desc: t.danger1Desc },
    { Icon: LinkOff, title: t.danger2Title, desc: t.danger2Desc },
    { Icon: LockOpen, title: t.danger3Title, desc: t.danger3Desc },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-zinc-50 to-djp-blue/5">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-djp-blue/10 bg-white/85 backdrop-blur">
        <div className="app-container flex h-16 items-center justify-between gap-4">
          <Brand subtitle={t.brandSub} />

          <div ref={langWrapRef} className="relative">
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-djp-blue/15 bg-white pl-3 pr-3.5 text-sm font-bold text-djp-blue transition hover:bg-djp-blue/5"
            >
              <span>{lang === "id" ? "🇮🇩" : "🇺🇸"}</span>
              {lang.toUpperCase()}
              <Chevron className={`h-4 w-4 transition ${langOpen ? "rotate-180" : ""}`} />
            </button>
            {langOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-48 rounded-xl border border-djp-blue/10 bg-white p-2 shadow-lg">
                {(["id", "en"] as Lang[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLang(code);
                      setLangOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-djp-blue/5 ${
                      lang === code ? "bg-djp-blue/5 font-bold text-djp-blue" : "text-[var(--text-soft)]"
                    }`}
                  >
                    <span>{code === "id" ? "🇮🇩" : "🇺🇸"}</span>
                    {code === "id" ? "Indonesia" : "English"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="app-container flex-1 py-14 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="min-w-0 max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-djp-gold/30 bg-djp-gold/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[#9a6b00]">
              {t.heroBadge}
            </span>
            <h1 className="mt-6 font-heading text-3xl font-extrabold leading-tight tracking-tight text-djp-blue sm:text-4xl md:text-5xl">
              {t.heroHeadline}
            </h1>
            <p className="mt-5 text-base leading-relaxed text-[var(--text-soft)] sm:text-lg">
              {t.heroSubtitle}
            </p>
            <div className="mt-9 flex flex-col items-start gap-4">
              <LinkButton href="/login" size="lg">
                {t.cta}
                <ArrowRight className="h-5 w-5" />
              </LinkButton>
              <p className="text-sm text-[var(--text-muted)]">{t.ctaNote}</p>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid min-w-0 gap-5">
            <InfoCard
              variant="safe"
              Icon={ShieldCheck}
              title={t.safeTitle}
              desc={t.safeDesc}
              items={safeItems}
            />
            <InfoCard
              variant="danger"
              Icon={ShieldX}
              title={t.dangerTitle}
              desc={t.dangerDesc}
              items={dangerItems}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-djp-blue/10 bg-white/60 py-7">
        <p className="app-container text-center text-[13px] font-medium leading-relaxed text-[var(--text-muted)]">
          {t.footer}
        </p>
      </footer>
    </div>
  );
}

function InfoCard({
  variant,
  Icon,
  title,
  desc,
  items,
}: {
  variant: "safe" | "danger";
  Icon: (p: { className?: string }) => React.JSX.Element;
  title: string;
  desc: string;
  items: { Icon: (p: { className?: string }) => React.JSX.Element; title: string; desc: string }[];
}) {
  const accent =
    variant === "safe"
      ? { bg: "bg-emerald-50", text: "text-emerald-600", ring: "border-emerald-100" }
      : { bg: "bg-rose-50", text: "text-rose-600", ring: "border-rose-100" };
  return (
    <div className={`rounded-2xl border ${accent.ring} bg-white p-6 shadow-sm sm:p-7`}>
      <div className="mb-5 flex items-center gap-4 border-b border-zinc-100 pb-5">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accent.bg} ${accent.text}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-extrabold text-djp-blue">{title}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--text-muted)]">{desc}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-4">
        {items.map(({ Icon: ItemIcon, title: it, desc: id }) => (
          <li key={it} className="flex gap-3.5">
            <ItemIcon className={`mt-0.5 h-5 w-5 shrink-0 ${accent.text}`} />
            <div className="min-w-0">
              <strong className="block text-sm font-bold text-[var(--text-main)]">{it}</strong>
              <span className="mt-0.5 block text-sm leading-relaxed text-[var(--text-soft)]">
                {id}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
