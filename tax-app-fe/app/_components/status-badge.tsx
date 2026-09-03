"use client";

import { useLang } from "./lang";
import type { SptStatus } from "../_lib/spt";

/**
 * Status pill. Green is reserved for the filed state — the one genuine
 * success — so a page full of drafts never turns green and dilutes it.
 */
const TONE: Record<SptStatus, string> = {
  DRAFT: "border-border bg-surface text-muted",
  WAITING_PAYMENT: "border-pending/30 bg-pending-tint text-pending",
  REPORTED: "border-primary/30 bg-tertiary text-primary",
  REJECTED: "border-error/30 bg-error-tint text-error",
};

export function StatusBadge({ status }: { status: SptStatus }) {
  const { t } = useLang();
  const label = {
    DRAFT: t.statusDraft,
    WAITING_PAYMENT: t.statusWaiting,
    REPORTED: t.statusReported,
    REJECTED: t.statusRejected,
  }[status];

  return (
    <span
      className={`type-label-sm inline-flex items-center gap-xs rounded-full border px-sm py-xs ${TONE[status]}`}
    >
      <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
