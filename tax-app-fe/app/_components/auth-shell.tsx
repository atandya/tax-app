"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "./brand";
import { Eye, EyeOff } from "./icons";
import { LangToggle, useLang } from "./lang";
import type { Dict } from "../_lib/i18n";

/**
 * Chrome for /login and /register: a single centred column at most 440px
 * wide. A dark green hero block carries the wordmark and tagline, anchoring
 * the brand before the form; the form itself sits on white below it. Dark
 * green appears here and on the main-menu header, nowhere else.
 */
export function AuthShell({ children }: { children: (t: Dict) => ReactNode }) {
  const { t } = useLang();

  return (
    <div className="flex min-h-[calc(100vh-var(--disclaimer-h))] flex-col bg-surface">
      <header className="border-b border-border bg-neutral">
        <div className="shell flex h-[var(--nav-h)] items-center justify-between gap-md">
          <Brand href="/" />
          <LangToggle />
        </div>
      </header>

      <main className="flex flex-1 justify-center px-lg py-xl sm:py-2xl">
        <div className="w-full max-w-[440px]">
          <section className="rounded-md bg-secondary px-lg py-xl text-center">
            <div className="flex justify-center">
              <Brand tone="dark" size="lg" />
            </div>
            <p className="type-body-md mx-auto mt-md max-w-[34ch] text-white/80">
              {t.descTagline}
            </p>
          </section>

          <div className="mt-lg rounded-md border border-border bg-neutral p-lg">
            {children(t)}
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-neutral py-lg">
        <p className="shell type-label-sm text-center text-muted">{t.footer}</p>
      </footer>
    </div>
  );
}

/**
 * The small link card under the form — "new here?", "already registered?".
 * Content card treatment: 1px border, moderate rounding, tertiary tint on
 * hover. No icon in a rounded container.
 */
export function MiniCard({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-border bg-neutral px-md py-sm transition hover:border-primary hover:bg-tertiary"
    >
      <span className="type-label-md block text-on-neutral">{title}</span>
      <span className="type-body-sm block text-primary">{desc}</span>
    </Link>
  );
}

/** Divider with a word in the middle — "atau" / "or". */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-md">
      <span className="divider flex-1" />
      <span className="type-label-sm text-muted">{label}</span>
      <span className="divider flex-1" />
    </div>
  );
}

/**
 * Show / hide control inside a password field. The icon sits inline at text
 * size — no circle, no rounded container behind it.
 */
export function PasswordToggleButton({
  shown,
  onToggle,
  label,
}: {
  shown: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={shown}
      className="absolute right-md top-1/2 -translate-y-1/2 text-muted transition hover:text-primary"
    >
      {shown ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );
}
