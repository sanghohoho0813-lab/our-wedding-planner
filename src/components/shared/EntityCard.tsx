"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "@/components/ui/FavoriteButton";

export interface Stat {
  label: string;
  value: ReactNode;
  tone?: "accent" | "muted" | "default" | "danger" | "success";
}

export function EntityCard({
  title,
  subtitle,
  badges,
  stats,
  footer,
  onClick,
  favorite,
  onFavorite,
  highlight,
  leading,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  stats?: Stat[];
  footer?: ReactNode;
  onClick: () => void;
  favorite?: boolean;
  onFavorite?: (v: boolean) => void;
  highlight?: boolean;
  leading?: ReactNode;
}) {
  return (
    <li className={cn("card card-hover", highlight && "border-accent/60 ring-1 ring-accent/30")}>
      <div className="flex items-start gap-2 p-4">
        {leading && <div className="shrink-0">{leading}</div>}
        <button type="button" onClick={onClick} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[1.0625rem] font-semibold text-fg">{title}</span>
            {badges}
          </div>
          {subtitle && <p className="mt-0.5 truncate text-[0.875rem] text-fg-3">{subtitle}</p>}
          {stats && stats.length > 0 && (
            <dl className={cn("mt-3 grid gap-3", stats.length >= 3 ? "grid-cols-3" : "grid-cols-2")}>
              {stats.map((s) => (
                <div key={s.label} className="min-w-0">
                  <dt className="text-[0.75rem] text-fg-3">{s.label}</dt>
                  <dd
                    className={cn(
                      "truncate tabular text-[1rem] font-semibold",
                      s.tone === "accent" ? "text-accent-text" : s.tone === "muted" ? "text-fg-2 font-medium" : s.tone === "danger" ? "text-danger" : s.tone === "success" ? "text-success" : "text-fg",
                    )}
                  >
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {footer && <div className="mt-2 text-[0.8125rem] text-fg-3">{footer}</div>}
        </button>
        {onFavorite && <FavoriteButton active={!!favorite} onChange={onFavorite} className="-mr-2 -mt-1" />}
      </div>
    </li>
  );
}
