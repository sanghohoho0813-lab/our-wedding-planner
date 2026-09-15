"use client";
import { Plus, Search, Wallet } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useMediaQuery } from "@/lib/hooks";
import { computeBudget, type ItemSummary } from "@/lib/compute";
import { formatKRW, formatSignedKRW, formatSignedPct } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { inputCls } from "@/components/ui/Field";
import { PageHeader } from "@/components/layout/PageHeader";
import { MasterDetail } from "@/components/layout/MasterDetail";
import { BudgetItemDetail } from "./BudgetItemDetail";
import { BudgetItemSheet } from "./BudgetItemSheet";

type Sort = "category" | "amount" | "updated";

const PAY_LABEL = { unpaid: "미결제", partial: "부분 결제", paid: "완납" } as const;
const PAY_TONE = { unpaid: "neutral", partial: "warning", paid: "success" } as const;

function ItemCard({ s, onOpen, selected }: { s: ItemSummary; onOpen: (id: string) => void; selected?: boolean }) {
  const patch = useWeddingStore((st) => st.patch);
  const { item } = s;
  const hasActual = item.actual_amount > 0;
  return (
    <li className={cn("card card-hover", selected && "border-accent/60 ring-1 ring-accent/30")}>
      <div className="flex items-start gap-2 p-4">
        <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[1.0625rem] font-semibold text-fg">{item.name}</span>
            <Badge tone={PAY_TONE[s.paymentStatus]}>{PAY_LABEL[s.paymentStatus]}</Badge>
          </div>
          {item.vendor_name && <p className="mt-0.5 truncate text-[0.875rem] text-fg-3">{item.vendor_name}</p>}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[0.75rem] text-fg-3">예상</p>
              <p className="tabular text-[1rem] font-medium text-fg-2">{item.estimated_amount ? formatKRW(item.estimated_amount) : "—"}</p>
            </div>
            <div>
              <p className="text-[0.75rem] text-fg-3">실제</p>
              <p className="tabular text-[1rem] font-semibold text-fg">{hasActual ? formatKRW(item.actual_amount) : "—"}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[0.8125rem]">
            {hasActual && item.estimated_amount > 0 ? (
              <span className={cn("tabular font-medium", s.diff > 0 ? "text-warning" : s.diff < 0 ? "text-success" : "text-fg-3")}>
                {formatSignedKRW(s.diff)} ({formatSignedPct(s.diffPct)})
              </span>
            ) : (
              <span className="text-fg-3">{hasActual ? "견적 없음" : "실제 금액 미입력"}</span>
            )}
            <span className="text-fg-3">
              전체 예산의 <b className="tabular text-fg-2">{s.pctOfTotal.toFixed(1)}%</b>
              {s.unpaid > 0 && <> · 미결제 <b className="tabular text-accent-text">{formatKRW(s.unpaid)}</b></>}
            </span>
          </div>
        </button>
        <FavoriteButton active={item.is_favorite} onChange={(v) => patch("budget_items", item.id, { is_favorite: v }, { log: false })} className="-mr-2 -mt-1" />
      </div>
    </li>
  );
}

export function BudgetItemsView({ embedded }: { embedded?: boolean } = {}) {
  const params = useSearchParams();
  const data = useWeddingStore((s) => s.data!);
  const [category, setCategory] = useState<string | null>(params.get("category"));
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>("category");
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
  const [onlyFav, setOnlyFav] = useState(params.get("filter") === "favorite");
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const wide = useMediaQuery("(min-width: 1280px)");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const open = (id: string) => (wide ? setSelectedId(id) : setEditId(id));

  const b = computeBudget(data.wedding, data.budget_categories, data.budget_items, data.payments);
  const cats = [...data.budget_categories].sort((x, y) => x.sort_order - y.sort_order);

  const list = useMemo(() => {
    let l = b.items;
    if (category === "__none__") l = l.filter((s) => !s.item.category_id);
    else if (category) l = l.filter((s) => s.item.category_id === category);
    if (onlyUnpaid) l = l.filter((s) => s.unpaid > 0);
    if (onlyFav) l = l.filter((s) => s.item.is_favorite);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      l = l.filter((s) => s.item.name.toLowerCase().includes(t) || (s.item.vendor_name ?? "").toLowerCase().includes(t) || (s.item.memo ?? "").toLowerCase().includes(t));
    }
    const arr = [...l];
    if (sort === "amount") arr.sort((x, y) => y.effective - x.effective);
    else if (sort === "updated") arr.sort((x, y) => y.item.updated_at.localeCompare(x.item.updated_at));
    return arr;
  }, [b.items, category, onlyUnpaid, onlyFav, q, sort]);

  const groups = useMemo(() => {
    if (sort !== "category") return [{ key: "all", name: null as string | null, items: list, total: list.reduce((s, x) => s + x.effective, 0) }];
    const order = new Map(cats.map((c, i) => [c.id, i]));
    const by = new Map<string, ItemSummary[]>();
    for (const s of list) {
      const k = s.item.category_id ?? "__none__";
      by.set(k, [...(by.get(k) ?? []), s]);
    }
    return [...by.entries()]
      .sort((x, y) => (order.get(x[0]) ?? 999) - (order.get(y[0]) ?? 999))
      .map(([k, items]) => ({ key: k, name: cats.find((c) => c.id === k)?.name ?? "미분류", items, total: items.reduce((s, x) => s + x.effective, 0) }));
  }, [list, sort, cats]);

  return (
    <div>
      <PageHeader
        compact={embedded}
        title="상세 예산"
        description={`${data.budget_items.length}개 항목 · 예상 총 지출 ${formatKRW(b.totalEffective)}`}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> 비용 추가
          </Button>
        }
      >
        <div className="space-y-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
            <Chip size="sm" active={category === null} onClick={() => setCategory(null)}>전체</Chip>
            {cats.map((c) => (
              <Chip key={c.id} size="sm" active={category === c.id} onClick={() => setCategory(category === c.id ? null : c.id)}>
                {c.name}
              </Chip>
            ))}
            {data.budget_items.some((i) => !i.category_id) && (
              <Chip size="sm" active={category === "__none__"} onClick={() => setCategory(category === "__none__" ? null : "__none__")}>미분류</Chip>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[10rem] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="항목 · 업체 검색" className={`${inputCls} h-10 rounded-full pl-10`} />
            </label>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              <Chip size="sm" tone="neutral" active={onlyUnpaid} onClick={() => setOnlyUnpaid((v) => !v)}>미결제만</Chip>
              <Chip size="sm" tone="neutral" active={onlyFav} onClick={() => setOnlyFav((v) => !v)}>즐겨찾기</Chip>
              {(["category", "amount", "updated"] as Sort[]).map((s) => (
                <Chip key={s} size="sm" tone="neutral" active={sort === s} onClick={() => setSort(s)}>
                  {s === "category" ? "카테고리순" : s === "amount" ? "금액순" : "최근 수정"}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </PageHeader>

      <MasterDetail
        detail={<BudgetItemDetail itemId={selectedId} />}
        list={
          list.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Wallet />}
            title={data.budget_items.length === 0 ? "아직 예산 항목이 없어요" : "조건에 맞는 항목이 없어요"}
            description="웨딩홀, 스드메, 신혼여행 등 비용을 추가하면 비율과 차액이 자동으로 계산돼요."
            actionLabel="첫 비용 추가"
            onAction={() => setCreating(true)}
          />
        </div>
          ) : (
            <div className="space-y-6">
              {groups.map((g) => (
                <section key={g.key}>
                  {g.name && (
                    <div className="mb-2 flex items-center justify-between px-1">
                      <h2 className="text-[1rem] font-semibold text-fg">{g.name}</h2>
                      <span className="tabular text-[0.875rem] text-fg-2">
                        {formatKRW(g.total)} <span className="text-fg-3">· {((g.total / Math.max(b.totalBudget, b.totalEffective, 1)) * 100).toFixed(1)}%</span>
                      </span>
                    </div>
                  )}
                  <ul className="grid gap-3 md:grid-cols-2">
                    {g.items.map((s) => (
                      <ItemCard key={s.item.id} s={s} onOpen={open} selected={selectedId === s.item.id} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )
        }
      />

      <BudgetItemSheet
        open={!!editId || creating}
        onClose={() => { setEditId(null); setCreating(false); }}
        itemId={editId}
        initial={category && category !== "__none__" ? { category_id: category } : undefined}
      />
    </div>
  );
}
