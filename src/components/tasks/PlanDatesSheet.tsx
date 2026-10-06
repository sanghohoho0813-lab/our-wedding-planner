"use client";
import { CalendarX2, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { suggestTaskDates, typicalLabel, type DateSuggestion } from "@/lib/compute";
import { daysUntil, formatDDay, formatShortDate, todayISO } from "@/lib/date";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn, nowISO } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

interface RowState {
  date: string;
  include: boolean;
}

/**
 * 할 일 날짜를 한 번에 정리한다.
 *
 * 날짜 없는 할 일 · 마감이 지난 할 일을 모아서, 결혼식 기준 '보통 하는 시기' 로 날짜를 골라 둔다.
 * 사람은 훑어보고 [날짜 정하기] 한 번만 누르면 된다. 이미 끝낸 일은 [했어요] 로 바로 치운다.
 * 전에는 할 일을 하나씩 열어서 날짜를 고민해야 했다(13개면 40번 가까이 눌러야 했다).
 */
export function PlanDatesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tasks = useWeddingStore((s) => s.data?.tasks ?? []);
  const weddingDate = useWeddingStore((s) => s.data?.wedding.wedding_date ?? null);
  const patch = useWeddingStore((s) => s.patch);
  const log = useWeddingStore((s) => s.log);
  const today = todayISO();

  // 열 때 한 번만 계산한다 — 고르는 동안 줄이 움직이면 안 된다
  const [list, setList] = useState<DateSuggestion[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  useEffect(() => {
    if (!open || !weddingDate) return;
    const s = suggestTaskDates(tasks, weddingDate, todayISO());
    setList(s);
    setRows(Object.fromEntries(s.map((x) => [x.task.id, { date: x.date, include: true }])));
    // tasks 는 일부러 뺀다: 열려 있는 동안 상대가 고쳐도 목록이 뒤섞이지 않게
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, weddingDate]);

  const visible = list.filter((s) => rows[s.task.id]);
  const late = visible.filter((s) => s.late || s.overdue);
  const later = visible.filter((s) => !s.late && !s.overdue);
  const chosen = visible.filter((s) => rows[s.task.id]?.include && rows[s.task.id]?.date);
  const daysLeft = weddingDate ? daysUntil(weddingDate, today) : null;

  const done = (s: DateSuggestion) => {
    patch("tasks", s.task.id, { status: "done", completed_at: nowISO() });
    setRows((r) => {
      const next = { ...r };
      delete next[s.task.id];
      return next;
    });
  };

  const apply = () => {
    const before = chosen.map((s) => ({ id: s.task.id, due: s.task.due_date }));
    for (const s of chosen) patch("tasks", s.task.id, { due_date: rows[s.task.id].date }, { log: false });
    const n = chosen.length;
    log(`할 일 ${n}개의 날짜를 정했어요.`, "tasks", null, "update");
    toast(`할 일 ${n}개에 날짜를 정했어요.`, {
      tone: "success",
      duration: 8000,
      action: {
        label: "되돌리기",
        onClick: () => {
          for (const b of before) patch("tasks", b.id, { due_date: b.due }, { log: false });
        },
      },
    });
    onClose();
  };

  const section = (title: string, items: DateSuggestion[], tone: "late" | "plain") =>
    items.length > 0 && (
      <section>
        <h3 className={cn("mb-1.5 text-[0.875rem] font-semibold", tone === "late" ? "text-danger" : "text-fg-2")}>
          {title} <span className="tabular">{items.length}</span>
        </h3>
        <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">
          {items.map((s) => {
            const r = rows[s.task.id];
            return (
              <li key={s.task.id} className="flex gap-3 px-3 py-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={r.include}
                  aria-label={`${s.task.title} 날짜 정하기에 넣기`}
                  onClick={() => setRows((x) => ({ ...x, [s.task.id]: { ...r, include: !r.include } }))}
                  className={cn(
                    "relative tap-44 mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] border-2 transition-colors",
                    r.include ? "border-accent bg-accent text-accent-fg" : "border-line-strong bg-surface",
                  )}
                >
                  {r.include && <Check className="size-4" strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  {/* 1줄: 무엇을 — 제목이 제일 중요하므로 폭을 가장 많이 준다 */}
                  <div className="flex items-start gap-2">
                    <p className={cn("min-w-0 flex-1 text-[1rem] font-medium leading-snug", r.include ? "text-fg" : "text-fg-3")}>{s.task.title}</p>
                    <button
                      type="button"
                      onClick={() => done(s)}
                      className="relative tap-44 shrink-0 pt-0.5 text-[0.8125rem] font-medium text-fg-3 hover:text-success"
                      aria-label={`${s.task.title} 이미 했어요`}
                    >
                      했어요
                    </button>
                  </div>
                  {/* 2줄: 왜 그 날짜인지 + 언제 — 이유가 잘리면 안 되므로 줄임표 대신 줄을 바꾼다 */}
                  <div className="mt-1 flex items-center gap-2">
                    <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-fg-3">
                      {s.overdue && s.task.due_date ? `마감 ${formatDDay(daysUntil(s.task.due_date, today))} · ` : s.late ? "늦어짐 · " : ""}
                      {typicalLabel(s.before)}
                    </p>
                    <label
                      className={cn(
                        "relative inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full border px-3 text-[0.9375rem] font-semibold tabular",
                        r.include ? "border-accent/60 bg-accent-softer text-accent-text" : "border-line bg-surface text-fg-3",
                      )}
                    >
                      {formatShortDate(r.date)}
                      {/* 보이는 건 '10.21 (수)', 누르면 폰의 날짜 고르기가 열린다 */}
                      <input
                        type="date"
                        value={r.date}
                        min={today}
                        aria-label={`${s.task.title} 날짜`}
                        onClick={(e) => {
                          try {
                            (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                          } catch {
                            /* 미지원 브라우저는 기본 동작 */
                          }
                        }}
                        onChange={(e) => e.target.value && setRows((x) => ({ ...x, [s.task.id]: { date: e.target.value, include: true } }))}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="할 일 날짜 정리"
      description={
        daysLeft !== null && daysLeft > 0
          ? `결혼식까지 D-${daysLeft} · 보통 하는 시기에 맞춰 날짜를 골라 뒀어요`
          : "보통 하는 시기에 맞춰 날짜를 골라 뒀어요"
      }
      footer={
        visible.length > 0 ? (
          <Button full size="lg" onClick={apply} disabled={chosen.length === 0}>
            {chosen.length > 0 ? `${chosen.length}개 날짜 정하기` : "고른 할 일이 없어요"}
          </Button>
        ) : (
          <Button full size="lg" variant="secondary" onClick={onClose}>
            닫기
          </Button>
        )
      }
    >
      {visible.length === 0 ? (
        <p className="py-8 text-center text-[1rem] text-fg-2">정리할 할 일이 없어요. 남은 할 일에 모두 날짜가 있어요.</p>
      ) : (
        <div className="space-y-5">
          {section("늦어진 일", late, "late")}
          {section("앞으로 할 일", later, "plain")}
          <p className="text-[0.8125rem] text-fg-3">
            날짜는 바로 고칠 수 있고, 빼고 싶은 일은 체크를 풀면 돼요. 정한 뒤에도 되돌릴 수 있어요.
          </p>
        </div>
      )}
    </Sheet>
  );
}

/** 정리할 할 일이 몇 개인지 (버튼 · 배지용) */
export function useUnplannedCount(): { undated: number; overdue: number } {
  const tasks = useWeddingStore((s) => s.data?.tasks);
  return useMemo(() => {
    const today = todayISO();
    let undated = 0;
    let overdue = 0;
    for (const t of tasks ?? []) {
      if (t.status === "done") continue;
      if (!t.due_date) undated++;
      else if (t.due_date < today) overdue++;
    }
    return { undated, overdue };
  }, [tasks]);
}

/**
 * '날짜 없는 일 13 · 지난 마감 1 → 날짜 정리' 줄.
 * 정리할 게 없으면 아무것도 그리지 않는다.
 */
export function PlanDatesButton({ className }: { className?: string }) {
  const { undated, overdue } = useUnplannedCount();
  const [open, setOpen] = useState(false);
  return (
    <>
      {undated + overdue > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-2 rounded-[12px] border border-dashed border-line-strong px-3 py-2.5 text-left text-[0.9375rem] text-fg-2 hover:bg-surface-2 hover:text-accent-text",
            className,
          )}
        >
          <CalendarX2 className="size-4 shrink-0 text-fg-3" />
          <span className="min-w-0 flex-1 truncate">
            {[undated > 0 ? `날짜 없는 일 ${undated}` : null, overdue > 0 ? `지난 마감 ${overdue}` : null].filter(Boolean).join(" · ")}
          </span>
          <span className="shrink-0 font-semibold text-accent-text">날짜 정리</span>
        </button>
      )}
      <PlanDatesSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
