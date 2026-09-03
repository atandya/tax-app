"use client";

import Link from "next/link";
import { Brand } from "./brand";
import { LangToggle, useLang } from "./lang";
import { LogoutButton } from "./logout-button";
import type { Me } from "../_lib/session";

/**
 * Top nav: white, 64px, one hairline along the bottom. Sits directly under
 * the fixed disclaimer bar and stays put while the page scrolls.
 */
export function AppHeader({
  me,
  active,
}: {
  me: Me;
  active?: "spt" | "admin";
}) {
  const { t } = useLang();
  const isAdmin = me.role === "admin";
  const home = isAdmin ? "/admin" : "/spt";

  return (
    <header className="sticky top-[var(--disclaimer-h)] z-40 border-b border-border bg-neutral">
      <div className="shell flex h-[var(--nav-h)] items-center justify-between gap-md">
        <div className="flex items-center gap-xl">
          <Brand href={home} />
          <nav className="hidden items-center gap-lg sm:flex">
            <NavLink
              href={home}
              label={isAdmin ? t.navReview : t.navMyReturns}
              active={active === (isAdmin ? "admin" : "spt")}
            />
          </nav>
        </div>

        <div className="flex items-center gap-md">
          <div className="hidden text-right leading-tight md:block">
            <div className="type-label-md text-on-neutral">{me.name}</div>
            <div className="type-label-sm text-muted">
              {isAdmin ? t.taxOfficer : `NPWP ${me.npwp ?? "—"}`}
            </div>
          </div>
          <LangToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`type-body-md no-underline transition ${
        active ? "text-primary" : "text-on-neutral hover:text-primary"
      }`}
    >
      {label}
    </Link>
  );
}
