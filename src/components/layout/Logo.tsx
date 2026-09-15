import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Logo({ size = "md", className, tagline = true }: { size?: "sm" | "md" | "lg"; className?: string; tagline?: boolean }) {
  const s = size === "lg" ? "text-[2rem]" : size === "md" ? "text-[1.625rem]" : "text-[1.375rem]";
  return (
    <Link href="/" className={cn("block group", className)} aria-label="홈으로">
      <span className={cn("font-script leading-none text-accent-text transition-colors group-hover:text-accent", s)}>{APP_NAME}</span>
      {tagline && <span className="mt-1 block text-[0.6875rem] text-fg-3 tracking-tight">{APP_TAGLINE}</span>}
    </Link>
  );
}
