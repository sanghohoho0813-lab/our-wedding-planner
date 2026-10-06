"use client";
import { CalendarClock, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { monthlyOutflow, payWhenDate, unscheduledPayments, type PayWhen, type Unscheduled } from "@/lib/compute";
import { formatShortDate, todayISO } from "@/lib/date";
import { formatKRW } from "@/lib/money";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";

const WHEN: { value: PayWhen; label: string }[] = [
  { value: "month_end", label: "이번 달" },
  { value: "next_month_end", label: "다음 달" },
  { value: "two_weeks_before", label: "2주 전" },
  { value: "wedding_day", label: "당일" },
  { value: "paid", label: "냈어요" },
];

interface RowState {
  when: PayWhen;
  include: boolean;
}

/**
 * 결제일이 안 정해진 돈에 날짜를 붙인다.
 *
 * 항목마다 남은 돈 · 보통 내는 때(기본값)를 보여주고, 한 번 눌러 바꾸게 한다.
 * 위에는 고른 대로 '몇 월에 얼마가 나가는지' 가 바로 다시 계산된다 —
 * 날짜를 정하는 이유가 결국 "그 달에 돈이 얼마나 필요한가" 이기 때문이다.
 * 이미 낸 돈은 [냈어요] 로 바로 결제 완료 기록을 남긴다.
 */
export function PaymentPlanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useWeddingStore((s) => s.data);
  const add = useWeddingStore((s) => s.add);
  const remove = useWeddingStore((s) => s.remove);
  const log = useWeddingStore((s) => s.log);
  const today = todayISO();
  const weddingDate = data?.wedding.wedding_date ?? today;

  const [list, setList] = useState<Unscheduled[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  useEffect(() => {
    if (!open || !data) return;
    const u = unscheduledPayments(data.budget_items, data.budget_categories, data.payments);
    setList(u);
    setRows(Object.fromEntries(u.map((x) => [x.key, { when: x.suggest, include: true }])));
    // 열려 있는 동안 목록이 바뀌지 않게 data 는 일부러 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chosen = list.filter((u) => rows[u.key]?.include);
  const openTotal = list.reduce((n, u) => n + u.open, 0);

  // 고른 대로 월별 지출을 다시 계산한다
  const preview = useMemo(() => {
    const existing = (data?.payments ?? []).filter((p) => !p.paid && p.due_date);
    const planned = chosen
      .filter((u) => rows[u.key].when !== "paid")
      .map((u) => ({
        amount: u.open,
        due_date: payWhenDate(rows[u.key].when, today, weddingDate),
        paid: false,
      }));
    return monthlyOutflow([...existing, ...planned], today);
  }, [data?.payments, chosen, rows, today, weddingDate]);

  const patch = useWeddingStore((s) => s.patch);

  const apply = () => {
    const created: string[] = [];
    const dated: {
      id: string;
      prev: { due_date: string | null; paid: boolean; paid_at: string | null };
    }[] = [];
    let scheduled = 0;
    let paidNow = 0;
    for (const u of chosen) {
      const when = rows[u.key].when;
      const due = payWhenDate(when, today, weddingDate);
      const isPaid = when === "paid";
      if (u.payment) {
        // 이미 있는 결제에 날짜(또는 완료)만 붙인다
        dated.push({
          id: u.payment.id,
          prev: {
            due_date: u.payment.due_date,
            paid: u.payment.paid,
            paid_at: u.payment.paid_at,
          },
        });
        patch("payments", u.payment.id, { due_date: due, paid: isPaid, paid_at: isPaid ? today : null }, { log: false });
      } else {
        const row = add(
          "payments",
          {
            budget_item_id: u.item.id,
            title: u.paid > 0 || u.scheduled > 0 ? "잔금" : "결제",
            amount: u.open,
            due_date: due,
            paid: isPaid,
            paid_at: isPaid ? today : null,
          },
          { log: false },
        );
        created.push(row.id);
      }
      if (isPaid) paidNow++;
      else scheduled++;
    }
    const parts = [scheduled > 0 ? `결제 일정 ${scheduled}건` : null, paidNow > 0 ? `결제 완료 ${paidNow}건` : null].filter(Boolean).join(" · ");
    log(`${parts}을 기록했어요.`, "payments", null, "create");
    toast(`${parts}을 기록했어요.`, {
      tone: "success",
      duration: 8000,
      action: {
        label: "되돌리기",
        onClick: () => {
          for (const id of created) remove("payments", id, { log: false, silent: true });
          for (const d of dated) patch("payments", d.id, d.prev, { log: false });
          toast("되돌렸어요.", { tone: "success" });
        },
      },
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="결제 일정 잡기"
      description={list.length > 0 ? `결제일이 없는 돈 ${formatKRW(openTotal)} · ${list.length}건` : undefined}
      footer={
        list.length > 0 ? (
          <Button full size="lg" onClick={apply} disabled={chosen.length === 0}>
            {chosen.length > 0 ? `${chosen.length}건 기록하기` : "고른 항목이 없어요"}
          </Button>
        ) : (
          <Button full size="lg" variant="secondary" onClick={onClose}>
            닫기
          </Button>
        )
      }
    >
      {list.length === 0 ? (
        <p className="py-8 text-center text-[1rem] text-fg-2">남은 돈에 모두 결제일이 있어요.</p>
      ) : (
        <div className="space-y-4">
          {/* 고른 대로 몇 월에 얼마가 나가는지 */}
          <div className="rounded-[14px] bg-surface-2 px-4 py-3" aria-live="polite">
            <p className="text-[0.8125rem] font-medium text-fg-2">이렇게 정하면 나갈 돈</p>
            <ul className="mt-1.5 space-y-1">
              {preview.months.map((m) => (
                <li key={m.key} className="flex items-baseline justify-between gap-3">
                  <span className="text-[0.9375rem] text-fg-2">{m.label}</span>
                  <span className="whitespace-nowrap tabular text-[1rem] font-semibold text-fg">{formatKRW(m.amount)}</span>
                </li>
              ))}
              {preview.months.length === 0 && <li className="text-[0.9375rem] text-fg-3">아직 없어요</li>}
            </ul>
          </div>

          <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">
            {list.map((u) => {
              const r = rows[u.key];
              if (!r) return null;
              const due = payWhenDate(r.when, today, weddingDate);
              return (
                <li key={u.key} className="px-3 py-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={r.include}
                      aria-label={`${u.item.name} 기록에 넣기`}
                      onClick={() =>
                        setRows((x) => ({
                          ...x,
                          [u.key]: { ...r, include: !r.include },
                        }))
                      }
                      className={cn(
                        "relative tap-44 mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] border-2 transition-colors",
                        r.include ? "border-accent bg-accent text-accent-fg" : "border-line-strong bg-surface",
                      )}
                    >
                      {r.include && <Check className="size-4" strokeWidth={3} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      {/* 1줄: 무엇 — 이름이 길어도 한 줄을 다 쓴다 */}
                      <p className={cn("text-[1rem] font-medium leading-snug", r.include ? "text-fg" : "text-fg-3")}>{u.item.name}</p>
                      {/* 2줄: 언제까지 · 얼마 — 날짜가 잘리면 안 되므로 줄임표 대신 줄을 바꾼다 */}
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-fg-3">
                          {[
                            u.payment ? `'${u.payment.title}' 날짜 없음` : u.categoryName,
                            u.firm ? null : "견적 기준",
                            u.paid > 0 ? `${formatKRW(u.paid)} 냄` : null,
                            r.when === "paid" ? "오늘 낸 것으로" : `${formatShortDate(due)}까지`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <span className="shrink-0 whitespace-nowrap tabular text-[1rem] font-semibold text-fg">{formatKRW(u.open)}</span>
                      </div>
                    </div>
                  </div>
                  {/* 보통은 한 줄 다섯 칸. 좁은 폰에 글씨가 크면 글자가 잘리지 않게 3칸 · 2칸으로 나눈다 */}
                  <div className="@container mt-2.5" role="radiogroup" aria-label={`${u.item.name} 결제 시기`}>
                    <div className="grid grid-cols-3 gap-0.5 rounded-[19px] border border-line bg-surface-2 p-0.5 @min-[17rem]:grid-cols-5 @min-[17rem]:rounded-full">
                      {WHEN.map((w) => (
                        <button
                          key={w.value}
                          type="button"
                          role="radio"
                          aria-checked={r.when === w.value}
                          onClick={() =>
                            setRows((x) => ({
                              ...x,
                              [u.key]: { when: w.value, include: true },
                            }))
                          }
                          className={cn(
                            "relative h-9 min-w-0 rounded-full px-0.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
                            r.when === w.value
                              ? w.value === "paid"
                                ? "bg-success-soft font-semibold text-success shadow-sm"
                                : "bg-surface font-semibold text-accent-text shadow-sm"
                              : "text-fg-2 hover:text-fg",
                          )}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-[0.8125rem] text-fg-3">업체와 정한 날이 따로 있으면 예산 항목에서 날짜를 고치면 돼요. 기록한 뒤에도 되돌릴 수 있어요.</p>
        </div>
      )}
    </Sheet>
  );
}

/** '결제일 안 정한 돈 ₩X · N건 → 결제 일정 잡기' 줄. 없으면 그리지 않는다. */
export function PaymentPlanButton({ className }: { className?: string }) {
  const data = useWeddingStore((s) => s.data);
  const [open, setOpen] = useState(false);
  const u = useMemo(() => (data ? unscheduledPayments(data.budget_items, data.budget_categories, data.payments) : []), [data]);
  const total = u.reduce((n, x) => n + x.open, 0);
  return (
    <>
      {u.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-2 rounded-[12px] border border-dashed border-line-strong px-3 py-2.5 text-left text-[0.9375rem] text-fg-2 hover:bg-surface-2 hover:text-accent-text",
            className,
          )}
        >
          <CalendarClock className="size-4 shrink-0 text-fg-3" />
          <span className="min-w-0 flex-1 truncate">
            결제일 없는 돈 <b className="tabular text-fg">{formatKRW(total)}</b> · {u.length}건
          </span>
          <span className="shrink-0 font-semibold text-accent-text">일정 잡기</span>
        </button>
      )}
      <PaymentPlanSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
