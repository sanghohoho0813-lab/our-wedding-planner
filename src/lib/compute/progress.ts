import type { Task } from "@/lib/db/types";
import { daysUntil, thisWeekRange, todayISO } from "@/lib/date";

export interface ProgressSummary {
  total: number;
  done: number;
  doing: number;
  waiting: number;
  todo: number;
  remaining: number;
  percent: number;
}

export function computeProgress(tasks: Task[]): ProgressSummary {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const doing = tasks.filter((t) => t.status === "doing").length;
  const waiting = tasks.filter((t) => t.status === "waiting").length;
  const todo = tasks.filter((t) => t.status === "todo").length;
  return {
    total,
    done,
    doing,
    waiting,
    todo,
    remaining: total - done,
    percent: total ? Math.round((done / total) * 100) : 0,
  };
}

export interface NextAction {
  task: Task;
  days: number | null;
  score: number;
}

/** 지금 해야 할 일: 마감 임박 > 진행 중 > 중요 > 시작 전 */
export function computeNextActions(tasks: Task[], limit = 5, today = todayISO()): NextAction[] {
  const scored = tasks
    .filter((t) => t.status !== "done")
    .map<NextAction>((t) => {
      const days = t.due_date ? daysUntil(t.due_date, today) : null;
      let score = 0;
      if (days !== null) {
        if (days < 0) score += 100 + Math.min(30, -days);
        else if (days <= 3) score += 90 - days * 5;
        else if (days <= 7) score += 70 - days * 2;
        else if (days <= 14) score += 50 - days;
        else score += Math.max(0, 30 - days / 5);
      }
      if (t.status === "doing") score += 25;
      if (t.priority === "high") score += 20;
      if (t.priority === "low") score -= 10;
      if (t.status === "waiting") score -= 15;
      return { task: t, days, score };
    })
    .sort((a, b) => b.score - a.score || (a.days ?? 9999) - (b.days ?? 9999));
  return scored.slice(0, limit);
}

export function tasksThisWeek(tasks: Task[], today = todayISO()) {
  const { start, end } = thisWeekRange(today);
  return tasks.filter((t) => t.due_date && t.due_date >= start && t.due_date <= end);
}

export function overdueTasks(tasks: Task[], today = todayISO()) {
  return tasks.filter((t) => t.status !== "done" && t.due_date && t.due_date < today);
}
