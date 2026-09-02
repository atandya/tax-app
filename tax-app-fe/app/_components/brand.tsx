import { DocCheck } from "./icons";

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[var(--djp-blue)] to-[var(--djp-blue-2)] text-white shadow-lg shadow-djp-blue/30">
        <DocCheck className="h-6 w-6" />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-djp-gold" />
      </div>
      <div className="leading-tight">
        <div className="font-heading text-lg font-extrabold tracking-tight text-djp-blue">
          Coretax<span className="text-djp-gold">DJP</span>
        </div>
        {subtitle ? (
          <div className="text-[11px] font-medium text-[var(--text-muted)]">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
