"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 넓은 화면에서는 목록 왼쪽 · 상세 오른쪽으로 나눈다.
 * 목록에서 항목을 눌러도 화면이 바뀌지 않고 오른쪽 패널만 갱신된다.
 * 좁은 화면에서는 목록만 보여주고 상세는 Bottom Sheet 가 맡는다.
 */
export function MasterDetail({ list, detail, className }: { list: ReactNode; detail: ReactNode; className?: string }) {
  return (
    <div className={cn("gap-4 xl:grid xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] xl:items-start", className)}>
      <div className="min-w-0">{list}</div>
      <aside className="hidden xl:block xl:sticky xl:top-[5.25rem]">{detail}</aside>
    </div>
  );
}

export function DetailPlaceholder({ title, description, icon }: { title: string; description: string; icon?: ReactNode }) {
  return (
    <div className="card flex min-h-[18rem] flex-col items-center justify-center px-6 py-10 text-center">
      {icon && <span className="mb-3 inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-text [&>svg]:size-6">{icon}</span>}
      <p className="text-[1rem] font-medium text-fg">{title}</p>
      <p className="mt-1 max-w-[16rem] text-[0.875rem] text-fg-3">{description}</p>
    </div>
  );
}

export function DetailCard({ title, actions, children }: { title: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="card flex max-h-[calc(100dvh-8rem)] flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="min-w-0 truncate text-[1.0625rem] font-semibold text-fg">{title}</h2>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </div>
  );
}
