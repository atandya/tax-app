import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

/**
 * Buttons are pills — the signature interactive affordance, and what keeps
 * actions visually distinct from the moderately rounded content cards.
 * Never give one a trailing arrow; the pill is affordance enough.
 */
export type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-outline";
export type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  extra = "",
) {
  return ["btn", `btn-${variant}`, SIZE_CLASS[size], extra]
    .filter(Boolean)
    .join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button {...props} type={type} className={buttonClass(variant, size, className)} />
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link {...rest} href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/**
 * A labelled field. The label sits above the input and is always visible —
 * no floating-label pattern. Helper text says what the field expects; when
 * the field errors, the same slot carries the validation message instead.
 */
export function Field({
  id,
  label,
  optional,
  helper,
  error,
  children,
}: {
  id: string;
  label: string;
  optional?: string;
  helper?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-sm">
      <label htmlFor={id} className="type-label-md text-on-neutral">
        {label}
        {optional && <span className="ml-1 text-muted">({optional})</span>}
      </label>
      {children}
      {(error || helper) && (
        <p
          id={`${id}-help`}
          className={`helper ${error ? "helper-error" : ""} -mt-xs`}
        >
          {error ?? helper}
        </p>
      )}
    </div>
  );
}

/** Custom checkbox / radio: 20px, primary fill when checked. */
export function Choice({
  kind,
  label,
  checked,
  onChange,
  disabled,
  className = "",
}: {
  kind: "checkbox" | "radio";
  label: ReactNode;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={`inline-flex items-start gap-sm ${
        disabled ? "opacity-60" : "cursor-pointer"
      } ${className}`}
    >
      <input
        type={kind}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`choice ${kind === "checkbox" ? "choice-box" : "choice-radio"} mt-px`}
      />
      <span className="type-body-sm text-on-neutral">{label}</span>
    </label>
  );
}

/**
 * Modal shell: dimmed backdrop, level-2 elevation, moderate rounding.
 *
 * The width is an explicit 440px rather than `max-w-md`. The design's spacing
 * tokens are named xs…2xl, and those names shadow Tailwind's container scale,
 * so `max-w-md` would resolve to `--spacing-md` (16px) instead of 28rem. Same
 * trap for `max-w-sm/lg/xl` — see the warning in globals.css.
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[var(--scrim)] p-md"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="elev-2 w-full max-w-[440px] rounded-md border border-border bg-neutral p-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="type-headline-md text-on-neutral">{title}</h2>
        {subtitle && <p className="helper mt-sm">{subtitle}</p>}
        <div className="mt-lg">{children}</div>
      </div>
    </div>
  );
}

/** Inline notice above a form or list. Borders, never shadows. */
export function Notice({
  kind = "info",
  children,
}: {
  kind?: "info" | "success" | "error";
  children: ReactNode;
}) {
  const tone =
    kind === "error"
      ? "border-error bg-error-tint text-error"
      : kind === "success"
        ? "border-primary bg-tertiary text-secondary"
        : "border-border bg-surface text-on-surface";
  return (
    <div className={`rounded-sm border px-md py-sm ${tone}`} role="status">
      <p className="type-body-sm">{children}</p>
    </div>
  );
}
