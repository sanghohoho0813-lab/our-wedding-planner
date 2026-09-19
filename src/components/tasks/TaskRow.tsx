"use client";
import { motion } from "framer-motion";
import { CalendarClock, Check } from "lucide-react";
import type { Task } from "@/lib/db/types";
import { daysUntil, formatDDay, todayISO } from "@/lib/date";
import { ASSIGNEE_LABEL, TASK_STATUS_LABEL } from "@/lib/labels";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn, nowISO } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle } from "@/components/ui/CheckCircle";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { SwipeRow } from "@/components/ui/SwipeRow";

export function TaskRow({
  task,
  onOpen,
  selected,
  onQuickDate,
}: {
  task: Task;
  onOpen: (id: string) => void;
  selected?: boolean;
  /** 왼쪽으로 밀면 마감일을 바꾼다 */
  onQuickDate?: (id: string) => void;
}) {
  const patch = useWeddingStore((s) => s.patch);
  const done = task.status === "done";
  const days = task.due_date ? daysUntil(task.due_date, todayISO()) : null;
  const toggle = () => {
    const next = !done;
    patch("tasks", task.id, { status: next ? "done" : "todo", completed_at: next ? nowISO() : null });
    // 완료하면 '완료' 묶음으로 접혀 들어가 눈앞에서 사라진다. 되돌릴 길을 바로 준다.
    if (next)
      toast(`'${task.title.length > 14 ? task.title.slice(0, 13) + "…" : task.title}' 완료했어요.`, {
        tone: "success",
        duration: 5000,
        action: {
          label: "실행 취소",
          onClick: () => patch("tasks", task.id, { status: "todo", completed_at: null }, { log: false }),
        },
      });
  };
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <SwipeRow
        right={{ icon: <Check />, label: done ? "다시 열기" : "완료", tone: "success", onAction: toggle }}
        left={onQuickDate ? { icon: <CalendarClock />, label: "마감일", tone: "accent", onAction: () => onQuickDate(task.id) } : undefined}
      >
        <div className={cn("flex items-center gap-3 px-4 py-3 min-h-[3.75rem] transition-colors hover:bg-surface-2", selected && "bg-accent-softer ring-1 ring-inset ring-accent/30")}>
        <CheckCircle checked={done} onChange={toggle} />
      <button type="button" onClick={() => onOpen(task.id)} className="min-w-0 flex-1 text-left">
        {/* 첫 줄은 마감일 + 제목만. 배지까지 같은 줄에 두면 좁은 화면이나 큰 글씨에서
            제목이 두어 글자로 잘려 버린다 — 정작 읽어야 하는 건 제목이다. */}
        <span className="flex items-center gap-2">
          {days !== null && !done && (
            <span className={cn("shrink-0 text-[0.875rem] font-semibold tabular", days < 0 ? "text-danger" : days <= 3 ? "text-accent-text" : "text-fg-3")}>
              {formatDDay(days)}
            </span>
          )}
          <span className={cn("truncate text-[1rem] font-medium", done ? "text-fg-3 line-through decoration-fg-3/50" : "text-fg")}>{task.title}</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[0.8125rem] text-fg-3">
          {task.priority === "high" && !done && <Badge tone="accent">중요</Badge>}
          {task.status === "doing" && <Badge tone="info">{TASK_STATUS_LABEL.doing}</Badge>}
          {task.status === "waiting" && <Badge tone="warning">{TASK_STATUS_LABEL.waiting}</Badge>}
          <span className="truncate">
            {[task.category, task.assignee !== "both" ? ASSIGNEE_LABEL[task.assignee] : null, task.memo ? "메모" : null].filter(Boolean).join(" · ") || " "}
          </span>
        </span>
      </button>
        <FavoriteButton active={task.is_favorite} onChange={(v) => patch("tasks", task.id, { is_favorite: v }, { log: false })} className="-mr-2" />
        </div>
      </SwipeRow>
    </motion.li>
  );
}
