"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { translations, type Dict, type Lang } from "../_lib/i18n";

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}

const STORAGE_KEY = "easytax.lang";
const CHANGE_EVENT = "easytax:langchange";

// Indonesian is the primary language; English is the secondary. The provider
// lives at the root so the disclaimer bar, the nav toggle and every page read
// one value — a page-local toggle would let the two disagree.
const LangContext = createContext<LangValue>({
  lang: "id",
  setLang: () => {},
  t: translations.id,
});

/* ---------------------------------------------------------------------------
 * The preference lives in localStorage, which is an external store, so it is
 * read through useSyncExternalStore rather than copied into state by an
 * effect. That keeps the server render and the first client render agreed on
 * Indonesian (no hydration mismatch) while a stored preference still applies
 * on the very next commit — and a change in another tab arrives through the
 * same subscription.
 * ------------------------------------------------------------------------- */

/**
 * Set only when localStorage refuses a write (private mode, blocked site
 * data). Storage is then unreadable too, so nothing can contradict it and the
 * toggle still works for the rest of the session — just not across reloads.
 */
let memoryLang: Lang | null = null;

function readStoredLang(): Lang {
  if (memoryLang !== null) return memoryLang;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "id" || stored === "en") return stored;
  } catch {
    // Unreadable storage — Indonesian stays the default.
  }
  return "id";
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The server has no storage to read, so it always renders Indonesian. */
const serverLang = (): Lang => "id";

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, readStoredLang, serverLang);

  // Keep the document language in step for screen readers and hyphenation.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      memoryLang = null;
    } catch {
      // Not persisted; fall back to the in-memory value for this session.
      memoryLang = next;
    }
    // `storage` only fires in *other* tabs, so this tab needs its own signal.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = useMemo(
    () => ({ lang, setLang, t: translations[lang] }),
    [lang, setLang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  return useContext(LangContext);
}

/**
 * Fixed above the nav on every page, every state. No close button — this is a
 * synthetic-data prototype and the notice has to stay visible.
 */
export function DisclaimerBar() {
  const { t } = useLang();
  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex h-[var(--disclaimer-h)] items-center justify-center border-b border-border bg-surface px-md"
      role="note"
    >
      <p className="type-label-sm truncate text-center text-muted">
        {t.disclaimer}
      </p>
    </div>
  );
}

/**
 * ID / EN switch. A two-segment pill rather than a dropdown: with exactly two
 * languages a menu hides the alternative behind a click.
 */
export function LangToggle({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { lang, setLang } = useLang();
  const dark = tone === "dark";
  return (
    <div
      className={`inline-flex h-9 items-center rounded-full border p-[3px] ${
        dark ? "border-white/25" : "border-border"
      }`}
      role="group"
      aria-label="Language"
    >
      {(["id", "en"] as Lang[]).map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            className={`type-label-sm h-full rounded-full px-3 transition ${
              active
                ? dark
                  ? "bg-white text-secondary"
                  : "bg-primary text-on-primary"
                : dark
                  ? "text-white/70 hover:text-white"
                  : "text-muted hover:text-on-neutral"
            }`}
          >
            {/* Uppercased in the source, not by text-transform: these are
                language-code abbreviations, not tracked-out label styling. */}
            {code === "id" ? "ID" : "EN"}
          </button>
        );
      })}
    </div>
  );
}
