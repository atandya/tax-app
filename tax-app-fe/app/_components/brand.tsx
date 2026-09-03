import Image from "next/image";
import Link from "next/link";
import logo from "../../public/logo.png";

/**
 * The EasyTax wordmark. On dark green surfaces the artwork's near-black
 * "Easy" would disappear, so there it is knocked out to solid white —
 * `brightness-0 invert` flattens the two-tone mark to one colour.
 */
export function Brand({
  tone = "light",
  size = "md",
  href,
  subtitle,
}: {
  tone?: "light" | "dark";
  size?: "md" | "lg";
  href?: string;
  subtitle?: string;
}) {
  const height = size === "lg" ? 40 : 28;
  const mark = (
    <Image
      src={logo}
      alt="EasyTax"
      height={height}
      width={Math.round((height * 843) / 179)}
      priority
      className={tone === "dark" ? "brightness-0 invert" : ""}
    />
  );

  const content = subtitle ? (
    <span className="flex flex-col gap-xs">
      {mark}
      <span
        className={`type-label-sm ${
          tone === "dark" ? "text-white/70" : "text-muted"
        }`}
      >
        {subtitle}
      </span>
    </span>
  ) : (
    mark
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex rounded-sm" aria-label="EasyTax">
        {content}
      </Link>
    );
  }
  return <span className="inline-flex">{content}</span>;
}
