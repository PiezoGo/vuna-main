import { cn } from "@/lib/utils";

type LogoMarkProps = { className?: string; title?: string };

/**
 * The VUNA mark: the original "V" tile, refined. The right stroke of the V
 * ends in a leaf, a nod to harvest ("vuna" is Swahili for "harvest").
 */
export function LogoMark({ className, title }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("size-9", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id="vuna-tile" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A67343" />
          <stop offset="1" stopColor="#6E4520" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#vuna-tile)" />
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="39"
        rx="10.5"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.14"
      />
      {/* V */}
      <path
        d="M11 12.5 L20 29 L25.2 19.4"
        fill="none"
        stroke="#fff"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* leaf on the right arm */}
      <path
        d="M25 19.6 C25.6 14.6 28.8 11.6 31.6 11.2 C31.9 14.6 29.6 18.4 25 19.6 Z"
        fill="#B7E4A1"
      />
      <path
        d="M25.6 18.8 L30 13.2"
        stroke="#6E4520"
        strokeOpacity="0.45"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

type LogoProps = { className?: string; markClassName?: string; withWordmark?: boolean };

export function Logo({ className, markClassName, withWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} title={withWordmark ? undefined : "VUNA"} />
      {withWordmark ? (
        <span className="font-display text-[22px] leading-none font-semibold tracking-tight text-foreground">
          vuna
        </span>
      ) : null}
    </span>
  );
}
