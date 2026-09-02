import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary"
  | "outline"
  | "ghost"
  | "danger"
  | "danger-outline"
  | "success";
type Size = "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-djp-blue/40 focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-djp-blue text-white shadow-sm hover:bg-djp-blue-2",
  outline: "border border-djp-blue/25 bg-white text-djp-blue hover:bg-djp-blue/5",
  ghost: "text-djp-blue hover:bg-djp-blue/8",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
  "danger-outline": "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
};

// Heights match the .control form-field height so buttons line up with inputs.
const SIZES: Record<Size, string> = {
  sm: "h-9 gap-1.5 px-4 text-xs",
  md: "h-10 px-6 text-sm",
  lg: "h-12 px-8 text-[15px]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return <button {...props} className={`${buttonClass(variant, size)} ${className}`} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`${buttonClass(variant, size)} ${className}`}>
      {children}
    </Link>
  );
}
