"use client";
import { AnimatePresence } from "framer-motion";
import { CheckSquare, ChevronDown, Plus, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMediaQuery, useTabs } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/db/types";
import { addDays, thisWeekRange, todayISO } from "@/lib/date";
import { computeProgress } from "@/lib/compute";
import { TASK_CATEGORIES } from "@/lib/labels";
import { mySide } from "@/lib/members";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Button } from "@/components/ui/Button";
import { Chip, ChipSelect } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineAdd } from "@/components/ui/InlineAdd";
import { inputCls } from "@/components/ui/Field";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { MasterDetail } from "@/components/layout/MasterDetail";
import { TaskDetail } from "./TaskDetail";
import { TaskRow } from "./TaskRow";
import { TaskSheet } from "./TaskSheet";
import { QuickDateSheet } from "./QuickDateSheet";

type Filter = "all" | "today" | "week" | "mine" | "undated" | "open" | "done" | "favorite";
type Sort = "due" | "priority" | "updated";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "today", label: "오늘" },
  { value: "week", label: "이번 주" },
  { value: "mine", label: "내 담당" },
  { value: "undated", label: "날짜 미정" },
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
const FILTER_VALUES = FILTERS.map((f) => f.value);

export function TasksView({ embedded }: { embedded?: boolean } = {}) {
  const params = useSearchParams();
  const tasks = useWeddingStore((s) => s.data!.tasks);
  const add = useWeddingStore((s) => s.add);
  const wedding = useWeddingStore((s) => s.data!.wedding);
  const meId = useWeddingStore((s) => s.userId);
  const side = mySide(wedding, meId);
  // '내 담당' 은 내가 신랑인지 신부인지 정했을 때만 의미가 있다(설정 › 계정에서 고른다).
  const filters = side ? FILTERS : FILTERS.filter((f) => f.value !== "mine");
  // 필터는 URL(?filter=)에 남기되 라우팅을 타지 않는다 → 탭 안에서 0ms 전환, 상단 벨·홈 링크로 들어와도 그대로 적용
  const [filter, setFilter] = useTabs<Filter>(FILTER_VALUES, "all", "filter");
  const [sort, setSort] = useState<Sort>("due");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [dateId, setDateId] = useState<string | null>(null);
  // 완료한 일은 기본으로 접어 둔다. 남은 일이 먼저 보여야 한다.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["done"]));
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const [creating, setCreating] = useState(false);
  const wide = useMediaQuery("(min-width: 1280px)");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const open = (id: string) => (wide ? setSelectedId(id) : setEditId(id));

  const today = todayISO();
  const week = thisWeekRange(today);
  const progress = computeProgress(tasks);

  const list = useMemo(() => {
    let l = tasks;
    if (filter === "today") l = l.filter((t) => t.status !== "done" && t.due_date && t.due_date <= today);
    else if (filter === "week") l = l.filter((t) => t.status !== "done" && t.due_date && t.due_date >= week.start && t.due_date <= week.end);
    else if (filter === "mine") l = l.filter((t) => t.status !== "done" && (t.assignee === side || t.assignee === "both"));
    else if (filter === "undated") l = l.filter((t) => t.status !== "done" && !t.due_date);
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
  }, [tasks, filter, category, q, sort, today, week.start, week.end, side]);

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
        compact={embedded}
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
          <InlineAdd
            placeholder="할 일 한 줄로 추가"
            onAdd={(title) =>
              add("tasks", {
                title,
                category: category ?? undefined,
                // 지금 보고 있는 화면에 맞춰 넣는다: '오늘' 을 보고 있으면 오늘 마감으로
                due_date: filter === "today" ? today : filter === "week" ? week.end : null,
                assignee: filter === "mine" && side ? side : undefined,
              })
            }
          />
          <ChipSelect options={filters} value={filter} onChange={setFilter} scroll size="sm" />
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

      <MasterDetail
        detail={<TaskDetail taskId={selectedId} />}
        list={
          list.length === 0 ? (
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
                    <h2>
                      <button
                        type="button"
                        onClick={() => toggleGroup(g.key)}
                        aria-expanded={!collapsed.has(g.key)}
                        className="flex w-full items-center justify-between gap-2 border-b border-line px-4 py-2.5 text-left text-[0.8125rem] font-semibold tracking-wide text-fg-3 hover:bg-surface-2"
                      >
                        <span className="flex items-center gap-1.5">
                          <ChevronDown className={cn("size-4 shrink-0 transition-transform", collapsed.has(g.key) && "-rotate-90")} />
                          {g.label}
                        </span>
                        <span className="tabular">{g.items.length}</span>
                      </button>
                    </h2>
                  )}
                  {(!g.label || !collapsed.has(g.key)) && (
                    <ul className="divide-y divide-line">
                      <AnimatePresence initial={false}>
                        {g.items.map((t) => (
                          <TaskRow key={t.id} task={t} onOpen={open} selected={selectedId === t.id} onQuickDate={setDateId} />
                        ))}
                      </AnimatePresence>
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )
        }
      />

      <TaskSheet open={!!editId || creating} onClose={() => { setEditId(null); setCreating(false); }} taskId={editId} initial={category ? { category } : undefined} />
      <QuickDateSheet taskId={dateId} onClose={() => setDateId(null)} />
    </div>
  );
}
