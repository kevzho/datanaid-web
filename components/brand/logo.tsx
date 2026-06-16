import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

/**
 * Datanaid logo — ascending data bars with a "spark" of impact on the tallest
 * bar. The mark reads as growth + care. Uses currentColor for the wordmark so
 * it adapts to dark/light, with the accent mark in the primary color.
 */
export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" className="fill-primary" />
        <rect x="7" y="17" width="4" height="8" rx="1.5" className="fill-primary-foreground" opacity="0.85" />
        <rect x="14" y="12" width="4" height="13" rx="1.5" className="fill-primary-foreground" opacity="0.92" />
        <rect x="21" y="7" width="4" height="18" rx="1.5" className="fill-primary-foreground" />
        <circle cx="23" cy="7" r="3" className="fill-primary-foreground" />
        <circle cx="23" cy="7" r="1.4" className="fill-primary" />
      </svg>
      {showWordmark && (
        <span className="font-display text-lg font-semibold tracking-tight text-foreground">
          Datanaid
        </span>
      )}
    </span>
  );
}
