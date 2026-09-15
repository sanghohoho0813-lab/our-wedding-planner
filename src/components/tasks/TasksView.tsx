"use client";
import { AnimatePresence } from "framer-motion";
import { CheckSquare, Plus, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { Task } from "@/lib/db/types";
import { addDays, thisWeekRange, todayISO } from "@/lib/date";
import { computeProgress } from "@/lib/compute";
import { TASK_CATEGORIES } from "@/lib/labels";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Button } from "@/components/ui/Button";
import { Chip, ChipSelect } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputCls } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskRow } from "./TaskRow";
import { TaskSheet } from "./TaskSheet";

type Filter = "all" | "today" | "week" | "open" | "done" | "favorite";
type Sort = "due" | "priority" | "updated";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "today", label: "오늘" },
  { value: "week", label: "이번 주" },
  { value: "open", label: "미완료" },
  { value: "done", label: "완료" },
  { value: "favorite", label: "즐겨찾기" },
];
const SORTS: { value: Sort; label: string }[] = [
  { value: "due", label: "마감순" },
  { value: "priority", label: "중요도순" },
  { value: "updated", label: "최근 수정순" },
];
const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

export function TasksView() {
  const params = useSearchParams();
  const router = useRouter();
  const tasks = useWeddingStore((s) => s.data!.tasks);
  const filter = (params.get("filter") as Filter) || "all";
  const [sort, setSort] = useState<Sort>("due");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const setFilter = (f: Filter) => {
    const sp = new URLSearchParams(params.toString());
    if (f === "all") sp.delete("filter");
    else sp.set("filter", f);
    router.replace(`/tasks${sp.toString() ? `?${sp}` : ""}`, { scroll: false });
  };

  const today = todayISO();
  const week = thisWeekRange(today);
  const progress = computeProgress(tasks);

  const list = useMemo(() => {
    let l = tasks;
    if (filter === "today") l = l.filter((t) => t.status !== "done" && t.due_date && t.due_date <= today);
    else if (filter === "week") l = l.filter((t) => t.status !== "done" && t.due_date && t.due_date >= week.start && t.due_date <= week.end);
    else if (filter === "open") l = l.filter((t) => t.status !== "done");
    else if (filter === "done") l = l.filter((t) => t.status === "done");
    else if (filter === "favorite") l = l.filter((t) => t.is_favorite);
    if (category) l = l.filter((t) => t.category === category);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      l = l.filter((t) => t.title.toLowerCase().includes(s) || (t.memo ?? "").toLowerCase().includes(s));
    }
    const arr = [...l];
    if (sort === "due") arr.sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    else if (sort === "priority") arr.sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
    else arr.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return arr;
  }, [tasks, filter, category, q, sort, today, week.start, week.end]);

  const groups = useMemo(() => {
    if (sort !== "due") return [{ key: "all", label: null as string | null, items: list }];
    const g: Record<string, Task[]> = { overdue: [], today: [], week: [], later: [], nodate: [], done: [] };
    for (const t of list) {
      if (t.status === "done") g.done.push(t);
      else if (!t.due_date) g.nodate.push(t);
      else if (t.due_date < today) g.overdue.push(t);
      else if (t.due_date === today) g.today.push(t);
      else if (t.due_date <= addDays(today, 7)) g.week.push(t);
      else g.later.push(t);
    }
    return [
      { key: "overdue", label: "지난 마감", items: g.overdue },
      { key: "today", label: "오늘", items: g.today },
      { key: "week", label: "7일 이내", items: g.week },
      { key: "later", label: "이후", items: g.later },
      { key: "nodate", label: "날짜 미정", items: g.nodate },
      { key: "done", label: "완료", items: g.done },
    ].filter((x) => x.items.length > 0);
  }, [list, sort, today]);

  const usedCategories = TASK_CATEGORIES.filter((c) => tasks.some((t) => t.category === c));

  return (
    <div>
      <PageHeader
        title="할 일"
        description={`완료 ${progress.done} / 전체 ${progress.total} · ${progress.percent}%`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 할 일 추가
          </Button>
        }
      >
        <ProgressBar value={progress.percent} height="h-1.5" />
        <div className="space-y-2">
          <ChipSelect options={FILTERS} value={filter} onChange={setFilter} scroll size="sm" />
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex-1 min-w-[10rem]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="할 일 검색" className={`${inputCls} h-10 pl-10 rounded-full`} />
            </label>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {SORTS.map((s) => (
                <Chip key={s.value} size="sm" tone="neutral" active={sort === s.value} onClick={() => setSort(s.value)}>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>
          {usedCategories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
              <Chip size="sm" active={category === null} onClick={() => setCategory(null)}>
                모든 카테고리
              </Chip>
              {usedCategories.map((c) => (
                <Chip key={c} size="sm" active={category === c} onClick={() => setCategory(category === c ? null : c)}>
                  {c}
                </Chip>
              ))}
            </div>
          )}
        </div>
      </PageHeader>

      {list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CheckSquare />}
            title={tasks.length === 0 ? "아직 등록된 할 일이 없어요" : "조건에 맞는 할 일이 없어요"}
            description={tasks.length === 0 ? "결혼 준비의 첫 할 일을 추가해 볼까요?" : "필터를 바꾸거나 새 할 일을 추가해 보세요."}
            actionLabel="할 일 추가"
            onAction={() => setCreating(true)}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.key} className="card overflow-hidden">
              {g.label && (
                <h2 className="flex items-center justify-between border-b border-line px-4 py-2 text-[0.75rem] font-semibold uppercase tracking-wide text-fg-3">
                  {g.label}
                  <span className="tabular">{g.items.length}</span>
                </h2>
              )}
              <ul className="divide-y divide-line">
                <AnimatePresence initial={false}>
                  {g.items.map((t) => (
                    <TaskRow key={t.id} task={t} onOpen={setEditId} />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <TaskSheet open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} taskId={editId} initial={category ? { category } : undefined} />
    </div>
  );
}
