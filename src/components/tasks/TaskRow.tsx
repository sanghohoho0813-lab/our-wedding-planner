"use client";
import { motion } from "framer-motion";
import type { Task } from "@/lib/db/types";
import { daysUntil, formatDDay, todayISO } from "@/lib/date";
import { ASSIGNEE_LABEL, TASK_STATUS_LABEL } from "@/lib/labels";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn, nowISO } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle } from "@/components/ui/CheckCircle";
import { FavoriteButton } from "@/components/ui/FavoriteButton";

export function TaskRow({ task, onOpen, selected }: { task: Task; onOpen: (id: string) => void; selected?: boolean }) {
  const patch = useWeddingStore((s) => s.patch);
  const done = task.status === "done";
  const days = task.due_date ? daysUntil(task.due_date, todayISO()) : null;
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn("flex items-center gap-3 px-4 py-3 min-h-[3.75rem] transition-colors hover:bg-surface-2", selected && "bg-accent-softer ring-1 ring-inset ring-accent/30")}>
      <CheckCircle checked={done} onChange={(v) => patch("tasks", task.id, { status: v ? "done" : "todo", completed_at: v ? nowISO() : null })} />
      <button type="button" onClick={() => onOpen(task.id)} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          {days !== null && !done && (
            <span className={cn("shrink-0 text-[0.875rem] font-semibold tabular", days < 0 ? "text-danger" : days <= 3 ? "text-accent-text" : "text-fg-3")}>
              {formatDDay(days)}
            </span>
          )}
          <span className={cn("truncate text-[1rem] font-medium", done ? "text-fg-3 line-through decoration-fg-3/50" : "text-fg")}>{task.title}</span>
          {task.priority === "high" && !done && <Badge tone="accent">중요</Badge>}
          {task.status === "doing" && <Badge tone="info">{TASK_STATUS_LABEL.doing}</Badge>}
          {task.status === "waiting" && <Badge tone="warning">{TASK_STATUS_LABEL.waiting}</Badge>}
        </span>
        <span className="mt-0.5 block truncate text-[0.8125rem] text-fg-3">
          {[task.category, task.assignee !== "both" ? ASSIGNEE_LABEL[task.assignee] : null, task.memo ? "메모" : null].filter(Boolean).join(" · ") || " "}
        </span>
      </button>
      <FavoriteButton active={task.is_favorite} onChange={(v) => patch("tasks", task.id, { is_favorite: v }, { log: false })} className="-mr-2" />
    </motion.li>
  );
}
