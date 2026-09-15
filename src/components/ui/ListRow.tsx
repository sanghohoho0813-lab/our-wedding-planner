"use client";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ListRow({
  left,
  title,
  subtitle,
  right,
  onClick,
  href,
  chevron = true,
  className,
  muted,
}: {
  left?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  href?: string;
  chevron?: boolean;
  className?: string;
  muted?: boolean;
}) {
  const inner = (
    <>
      {left && <div className="flex shrink-0 items-center">{left}</div>}
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-[0.9375rem] font-medium", muted ? "text-fg-3 line-through decoration-fg-3/60" : "text-fg")}>{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-[0.8125rem] text-fg-3">{subtitle}</div>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2 text-[0.8125rem] text-fg-2">{right}</div>}
      {chevron && (onClick || href) && <ChevronRight className="size-4 shrink-0 text-fg-3" />}
    </>
  );
  const base = cn(
    "flex w-full items-center gap-3 px-4 py-3 text-left min-h-[3.5rem] transition-colors",
    (onClick || href) && "hover:bg-surface-2 active:bg-surface-3 cursor-pointer",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={base}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()} className={base}>
        {inner}
      </div>
    );
  }
  return <div className={base}>{inner}</div>;
}
