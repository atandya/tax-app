"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Brand } from "./brand";
import { Check, Chevron, DocCheck } from "./icons";
import { translations, type Dict, type Lang } from "../_lib/i18n";

/**
 * Shared chrome for /login and /register — header with the language toggle,
 * the brand panel, and the footer. The page supplies its own card via the
 * render prop so it can read the active dictionary.
 */
export function AuthShell({ children }: { children: (t: Dict) => ReactNode }) {
  const [lang, setLang] = useState<Lang>("id");
  const [langOpen, setLangOpen] = useState(false);
  const t = translations[lang];
  const langWrapRef = useRef<HTMLDivElement>(null);

  // Close language dropdown on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (langWrapRef.current && !langWrapRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white via-zinc-50 to-djp-blue/5">
      <header className="border-b border-djp-blue/10 bg-white/85 backdrop-blur">
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
                      lang === code
                        ? "bg-djp-blue/5 font-bold text-djp-blue"
                        : "text-[var(--text-soft)]"
                    }`}
                  >
                    <span>{code === "id" ? "🇮🇩" : "🇺🇸"}</span>
                    {code === "id" ? "Indonesia" : "English"}
                    {lang === code && <Check className="ml-auto h-4 w-4 text-djp-blue" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="app-container flex flex-1 flex-col items-center justify-center gap-12 py-12 sm:py-16 lg:flex-row lg:justify-between lg:gap-20">
        <section className="hidden max-w-md flex-1 lg:block">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-djp-blue to-djp-blue-2 text-white shadow-lg">
            <DocCheck className="h-8 w-8" />
          </div>
          <div className="mt-6 h-1 w-16 rounded-full bg-gradient-to-r from-djp-gold to-transparent" />
          <h2 className="mt-5 font-heading text-3xl font-extrabold leading-tight text-djp-blue">
            {t.descTitle}
          </h2>
          <p className="mt-3 font-heading text-lg font-bold text-djp-blue-2">
            {t.descTagline}
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-[var(--text-soft)]">
            {t.descSubtitle}
          </p>
        </section>

        {children(t)}
      </main>

      <footer className="border-t border-djp-blue/10 bg-white/60 py-7">
        <p className="app-container text-center text-[13px] leading-relaxed text-[var(--text-muted)]">
          {t.footer}
        </p>
      </footer>
    </div>
  );
}

/** Small link card under the login / register form. */
export function MiniCard({
  Icon,
  title,
  desc,
  href,
}: {
  Icon: (p: { className?: string }) => React.JSX.Element;
  title: string;
  desc: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-djp-blue/10 text-djp-blue">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-bold text-djp-blue">{title}</strong>
        <span className="block truncate text-xs text-[var(--text-muted)]">{desc}</span>
      </span>
    </>
  );
  const className =
    "group flex items-center gap-3.5 rounded-xl border border-djp-blue/15 bg-white px-4 py-3.5 text-left transition hover:border-djp-blue/30 hover:bg-djp-blue/5";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={className}>
      {inner}
    </button>
  );
}
