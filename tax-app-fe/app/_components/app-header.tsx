import Link from "next/link";
import { DocCheck } from "./icons";
import { LogoutButton } from "./logout-button";
import type { Me } from "../_lib/session";

export function AppHeader({
  me,
  active,
}: {
  me: Me;
  active?: "spt" | "admin";
}) {
  const isAdmin = me.role === "admin";
  return (
    <header className="sticky top-0 z-30 border-b border-djp-blue/10 bg-white/90 backdrop-blur-md">
      <div className="app-container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-5 sm:gap-8">
          <Link
            href={isAdmin ? "/admin" : "/spt"}
            className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-djp-blue/40 focus-visible:ring-offset-2"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-djp-blue to-djp-blue-2 text-white shadow-sm shadow-djp-blue/25">
              <DocCheck className="h-5 w-5" />
            </div>
            <div className="font-heading text-base font-extrabold tracking-tight text-djp-blue">
              Coretax<span className="text-djp-gold">DJP</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {isAdmin ? (
              <NavLink href="/admin" label="Peninjauan SPT" active={active === "admin"} />
            ) : (
              <NavLink href="/spt" label="SPT Saya" active={active === "spt"} />
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-bold text-djp-blue">{me.name}</div>
            <div className="mt-0.5 text-xs text-[var(--text-muted)]">
              {isAdmin ? "Petugas Pajak" : `NPWP ${me.npwp ?? "-"}`}
            </div>
          </div>
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
      className={`inline-flex h-9 items-center rounded-lg px-5 text-sm font-bold transition ${
        active
          ? "bg-djp-blue text-white"
          : "text-djp-blue hover:bg-djp-blue/10"
      }`}
    >
      {label}
    </Link>
  );
}
