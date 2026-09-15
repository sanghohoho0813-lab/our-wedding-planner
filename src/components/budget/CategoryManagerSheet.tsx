"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { toast } from "@/lib/store/ui-store";
import { Button } from "@/components/ui/Button";
import { FieldRow, inputCls, TextField } from "@/components/ui/Field";
import { MoneyField } from "@/components/ui/MoneyField";
import { Sheet } from "@/components/ui/Sheet";

export function CategoryManagerSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useWeddingStore((s) => s.data!.budget_categories);
  const items = useWeddingStore((s) => s.data!.budget_items);
  const add = useWeddingStore((s) => s.add);
  const patch = useWeddingStore((s) => s.patch);
  const remove = useWeddingStore((s) => s.remove);
  const [name, setName] = useState("");
  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  const move = (idx: number, dir: -1 | 1) => {
    const a = sorted[idx];
    const b = sorted[idx + dir];
    if (!a || !b) return;
    patch("budget_categories", a.id, { sort_order: b.sort_order }, { log: false });
    patch("budget_categories", b.id, { sort_order: a.sort_order }, { log: false });
  };

  const create = () => {
    if (!name.trim()) return;
    add("budget_categories", { name: name.trim(), sort_order: (sorted.at(-1)?.sort_order ?? -1) + 1 });
    setName("");
  };

  return (
    <Sheet open={open} onClose={onClose} title="예산 카테고리 관리" description="카테고리별 계획 금액을 정하면 비중과 초과 여부를 계산해요." size="md">
      <ul className="space-y-2">
        {sorted.map((c, i) => {
          const count = items.filter((it) => it.category_id === c.id).length;
          return (
            <li key={c.id} className="rounded-[14px] border border-line bg-surface p-3">
              <div className="flex items-center gap-2">
                <TextField value={c.name} onChange={(v) => patch("budget_categories", c.id, { name: v })} className="h-10" />
                <button type="button" aria-label="위로" disabled={i === 0} onClick={() => move(i, -1)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-fg-3 hover:bg-surface-2 disabled:opacity-30">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" aria-label="아래로" disabled={i === sorted.length - 1} onClick={() => move(i, 1)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-fg-3 hover:bg-surface-2 disabled:opacity-30">
                  <ArrowDown className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="삭제"
                  onClick={() => {
                    if (count > 0) return toast(`항목 ${count}개가 있는 카테고리는 삭제할 수 없어요. 항목을 먼저 옮겨 주세요.`);
                    remove("budget_categories", c.id);
                  }}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-fg-3 hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-[0.8125rem] text-fg-3 shrink-0">계획 금액</span>
                <MoneyField size="sm" value={c.planned_amount} onChange={(v) => patch("budget_categories", c.id, { planned_amount: v })} title={`${c.name} 계획 금액`} />
                <span className="shrink-0 text-[0.8125rem] text-fg-3">{count}개 항목</span>
              </div>
            </li>
          );
        })}
      </ul>
      <FieldRow label="새 카테고리" className="mt-4">
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="예: 예물" className={inputCls} />
          <Button onClick={create} className="shrink-0">
            <Plus className="size-4" /> 추가
          </Button>
        </div>
      </FieldRow>
    </Sheet>
  );
}
