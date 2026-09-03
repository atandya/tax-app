"use client";

import { Brand } from "./_components/brand";
import { Check, DocCheck, IdCard, Refresh, User, Wifi } from "./_components/icons";
import { LangToggle, useLang } from "./_components/lang";
import { LinkButton } from "./_components/ui";

export default function LandingPage() {
  const { t } = useLang();

  const easy = [
    { Icon: Check, title: t.safe1Title, desc: t.safe1Desc },
    { Icon: Refresh, title: t.safe2Title, desc: t.safe2Desc },
    { Icon: Wifi, title: t.safe3Title, desc: t.safe3Desc },
  ];
  const prepare = [
    { Icon: DocCheck, title: t.danger1Title, desc: t.danger1Desc },
    { Icon: IdCard, title: t.danger2Title, desc: t.danger2Desc },
    { Icon: User, title: t.danger3Title, desc: t.danger3Desc },
  ];

  return (
    <div className="flex min-h-[calc(100vh-var(--disclaimer-h))] flex-col bg-neutral">
      <header className="sticky top-[var(--disclaimer-h)] z-40 border-b border-border bg-neutral">
        <div className="shell flex h-[var(--nav-h)] items-center justify-between gap-md">
          <Brand />
          <div className="flex items-center gap-md">
            <LangToggle />
            <LinkButton href="/login" size="sm">
              {t.loginButton}
            </LinkButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — a branding surface, so hero-scale spacing and display type. */}
        <section className="shell py-2xl">
          <div className="grid items-start gap-2xl lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="min-w-0">
              <span className="type-label-sm inline-flex items-center rounded-full border border-border bg-tertiary px-md py-xs text-primary">
                {t.heroBadge}
              </span>
              <h1 className="type-display mt-lg max-w-[16ch] text-on-neutral">
                {t.heroHeadline}
              </h1>
              <p className="type-body-lg measure mt-lg text-on-surface">
                {t.heroSubtitle}
              </p>
              <div className="mt-xl flex flex-wrap items-center gap-md">
                <LinkButton href="/login" size="lg">
                  {t.cta}
                </LinkButton>
                <LinkButton href="/register" variant="secondary" size="lg">
                  {t.ctaSecondary}
                </LinkButton>
              </div>
              <p className="helper mt-md">{t.ctaNote}</p>
            </div>

            <div className="grid min-w-0 gap-lg">
              <InfoCard title={t.safeTitle} desc={t.safeDesc} items={easy} />
              <InfoCard title={t.dangerTitle} desc={t.dangerDesc} items={prepare} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface py-lg">
        <p className="shell type-label-sm text-center text-muted">{t.footer}</p>
      </footer>
    </div>
  );
}

/**
 * Content card: 1px border, moderate rounding, no shadow. Icons sit inline
 * at text size beside their label rather than in a tinted tile.
 */
function InfoCard({
  title,
  desc,
  items,
}: {
  title: string;
  desc: string;
  items: {
    Icon: (p: { className?: string }) => React.JSX.Element;
    title: string;
    desc: string;
  }[];
}) {
  return (
    <section className="card">
      <h2 className="type-headline-sm text-on-neutral">{title}</h2>
      <p className="helper mt-xs">{desc}</p>
      <hr className="divider my-md" />
      <ul className="flex flex-col gap-md">
        {items.map(({ Icon, title: itemTitle, desc: itemDesc }) => (
          <li key={itemTitle} className="flex gap-sm">
            <Icon className="mt-[3px] h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="type-label-md text-on-neutral">{itemTitle}</p>
              <p className="type-body-sm mt-xs text-muted">{itemDesc}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
