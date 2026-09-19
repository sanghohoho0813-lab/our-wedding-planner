"use client";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ActivityLog, Wedding } from "@/lib/db/types";
import { relativeTime } from "@/lib/date";
import { actorLabel } from "@/lib/members";
import { cn } from "@/lib/utils";

const ICON = { create: <Plus />, delete: <Trash2 />, update: <Pencil /> } as const;

/** 활동 기록 한 줄. 누가 했는지 함께 보여준다(두 사람이 같이 쓰는 공간이라 이게 핵심이다). */
export function ActivityRow({
  log,
  wedding,
  meId,
  now,
  className,
}: {
  log: ActivityLog;
  wedding: Wedding;
  meId: string | null;
  now: Date | null;
  className?: string;
}) {
  const mine = !!meId && log.user_id === meId;
  const who = mine ? "나" : actorLabel(wedding, log.user_id);
  return (
    <li className={cn("flex items-start gap-3", className)}>
      <span
        className={cn(
          "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full [&>svg]:size-3.5",
          mine ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-fg-3",
        )}
      >
        {ICON[log.action] ?? ICON.update}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] leading-snug text-fg">{log.description}</p>
        <p className="text-[0.75rem] text-fg-3">
          {who && <span className={cn("font-medium", mine ? "text-accent-text" : "text-fg-2")}>{who}</span>}
          {who && " · "}
          {now ? relativeTime(log.created_at, now) : ""}
        </p>
      </div>
    </li>
  );
}
