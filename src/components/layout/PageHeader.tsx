import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
  compact,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
  /** 탭 안에 들어가는 화면 — 바깥에서 이미 제목을 보여주므로 제목을 숨긴다 */
  compact?: boolean;
}) {
  return (
    <div className={cn("mb-4 space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {!compact && <h1 className="hidden text-[1.75rem] font-bold tracking-tight text-fg lg:block">{title}</h1>}
          {description && <p className="text-[0.9375rem] text-fg-3">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
