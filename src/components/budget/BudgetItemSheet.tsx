"use client";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { RowValues } from "@/lib/db/defaults";
import type { BudgetItem } from "@/lib/db/types";
import { formatKoreanDate, todayISO } from "@/lib/date";
import { formatKRW, formatSignedKRW, formatSignedPct } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { toast } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { CheckCircle } from "@/components/ui/CheckCircle";
import { Chip, ChipSelect } from "@/components/ui/Chip";
import { DateField, FieldRow, TextArea, TextField } from "@/components/ui/Field";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { MoneyField } from "@/components/ui/MoneyField";
import { Sheet } from "@/components/ui/Sheet";
import { useEntityForm } from "@/components/shared/useEntityForm";
import { DeleteButton } from "@/components/ui/DeleteButton";

const PAYMENT_TITLES = ["계약금", "중도금", "잔금", "전액"];
const EMPTY: never[] = [];

type ItemValues = RowValues<"budget_items">;

/** 시트(모바일)와 상세 패널(PC)이 함께 쓰는 입력 묶음 */
export function BudgetItemFields({
  row,
  values,
  set,
  isEdit,
}: {
  row: BudgetItem | null;
  values: ItemValues;
  set: <K extends keyof ItemValues>(k: K, v: ItemValues[K]) => void;
  isEdit: boolean;
}) {
  const categories = useWeddingStore((s) => s.data?.budget_categories ?? EMPTY);
  const payments = useWeddingStore((s) => s.data?.payments ?? EMPTY);
  const remove = useWeddingStore((s) => s.remove);
  const add = useWeddingStore((s) => s.add);
  const patch = useWeddingStore((s) => s.patch);

  const itemPayments = useMemo(
    () => (row ? payments.filter((p) => p.budget_item_id === row.id).sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999")) : []),
    [payments, row],
  );
  const paid = itemPayments.filter((p) => p.paid).reduce((s, p) => s + p.amount, 0);
  const effective = values.actual_amount > 0 ? values.actual_amount : values.estimated_amount;
  const unpaid = Math.max(0, effective - paid);
  const diff = values.actual_amount > 0 ? values.actual_amount - values.estimated_amount : 0;
  const diffPct = values.actual_amount > 0 && values.estimated_amount > 0 ? (diff / values.estimated_amount) * 100 : 0;

  const [addingPayment, setAddingPayment] = useState(false);
  const [pTitle, setPTitle] = useState("잔금");
  const [pAmount, setPAmount] = useState(0);
  const [pDate, setPDate] = useState<string | null>(null);
  const [pPaid, setPPaid] = useState(false);

  const addPayment = () => {
    if (!row) return;
    if (pAmount <= 0) return toast("결제 금액을 입력해 주세요.");
    add("payments", { budget_item_id: row.id, title: pTitle, amount: pAmount, due_date: pDate, paid: pPaid, paid_at: pPaid ? pDate ?? todayISO() : null });
    setAddingPayment(false);
    setPAmount(0);
    setPDate(null);
    setPPaid(false);
  };

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-5">
      <FieldRow label="항목명" required>
        <TextField value={values.name} onChange={(v) => set("name", v)} placeholder="예: 스튜디오 촬영" autoFocus={!isEdit} delay={isEdit ? 400 : 0} />
      </FieldRow>
      <FieldRow label="카테고리">
        <ChipSelect
          size="sm"
          options={sorted.map((c) => ({ value: c.id, label: c.name }))}
          value={values.category_id}
          onChange={(v) => set("category_id", values.category_id === v ? null : v)}
        />
      </FieldRow>
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="예상 견적">
          <MoneyField value={values.estimated_amount} onChange={(v) => set("estimated_amount", v)} title="예상 견적" />
        </FieldRow>
        <FieldRow label="실제 금액">
          <MoneyField value={values.actual_amount} onChange={(v) => set("actual_amount", v)} title="실제 금액" />
        </FieldRow>
      </div>
      {values.actual_amount > 0 && values.estimated_amount > 0 && (
        <div
          className={cn(
            "flex items-center justify-between rounded-[12px] px-3.5 py-2.5 text-[0.9375rem]",
            diff > 0 ? "bg-warning-soft text-warning" : diff < 0 ? "bg-success-soft text-success" : "bg-surface-2 text-fg-2",
          )}
        >
          <span>{diff > 0 ? "예산 초과" : diff < 0 ? "예산 절감" : "견적과 동일"}</span>
          <span className="font-semibold tabular">
            {formatSignedKRW(diff)} <span className="opacity-80">({formatSignedPct(diffPct)})</span>
          </span>
        </div>
      )}
      <FieldRow label="업체">
        <TextField value={values.vendor_name ?? ""} onChange={(v) => set("vendor_name", v || null)} placeholder="업체명" />
      </FieldRow>

      {isEdit && row && (
        <div className="space-y-3 rounded-[16px] border border-line bg-surface-2/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[1rem] font-semibold text-fg">결제</h3>
            <div className="text-right text-[0.8125rem] text-fg-3">
              결제 <span className="font-semibold text-fg tabular">{formatKRW(paid)}</span> · 미결제{" "}
              <span className={cn("font-semibold tabular", unpaid > 0 ? "text-accent-text" : "text-fg")}>{formatKRW(unpaid)}</span>
            </div>
          </div>
          {itemPayments.length > 0 && (
            <ul className="divide-y divide-line rounded-[12px] border border-line bg-surface">
              {itemPayments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <CheckCircle checked={p.paid} onChange={(v) => patch("payments", p.id, { paid: v, paid_at: v ? todayISO() : null })} label={p.paid ? "결제 완료 취소" : "결제 완료로 표시"} />
                  <div className="min-w-0 flex-1">
                    <div className={cn("truncate text-[0.9375rem] font-medium", p.paid && "text-fg-3")}>{p.title}</div>
                    <div className="text-[0.8125rem] text-fg-3">
                      {p.paid ? `결제 완료${p.paid_at ? ` · ${formatKoreanDate(p.paid_at, { year: false })}` : ""}` : p.due_date ? `${formatKoreanDate(p.due_date, { year: false })} 예정` : "날짜 미정"}
                    </div>
                  </div>
                  <span className="tabular text-[0.9375rem] font-semibold">{formatKRW(p.amount)}</span>
                  <button type="button" aria-label="결제 삭제" onClick={() => remove("payments", p.id)} className="inline-flex size-9 items-center justify-center rounded-full text-fg-3 hover:bg-surface-2 hover:text-danger">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {addingPayment ? (
            <div className="space-y-3 rounded-[12px] border border-line bg-surface p-3">
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_TITLES.map((t) => (
                  <Chip key={t} size="sm" active={pTitle === t} onClick={() => setPTitle(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <MoneyField value={pAmount} onChange={setPAmount} title="결제 금액" />
                <div className="flex gap-1.5">
                  <Chip size="sm" active={!pPaid} onClick={() => setPPaid(false)} className="h-11 flex-1 justify-center">
                    결제 예정
                  </Chip>
                  <Chip size="sm" active={pPaid} onClick={() => setPPaid(true)} className="h-11 flex-1 justify-center" tone="success">
                    결제 완료
                  </Chip>
                </div>
              </div>
              {unpaid > 0 && pAmount !== unpaid && (
                <button type="button" onClick={() => setPAmount(unpaid)} className="text-[0.875rem] text-accent-text hover:underline">
                  미결제 금액 {formatKRW(unpaid)} 전체 입력
                </button>
              )}
              <DateField value={pDate} onChange={setPDate} placeholder={pPaid ? "결제일" : "결제 예정일"} />
              <div className="flex gap-2">
                <Button variant="secondary" full onClick={() => setAddingPayment(false)}>
                  취소
                </Button>
                <Button full onClick={addPayment}>
                  결제 추가
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              full
              onClick={() => {
                setAddingPayment(true);
                setPAmount(unpaid);
              }}
            >
              <Plus className="size-4" /> 결제 기록 추가
            </Button>
          )}
        </div>
      )}

      <FieldRow label="메모">
        <TextArea value={values.memo ?? ""} onChange={(v) => set("memo", v || null)} placeholder="옵션, 포함 내역, 협의 내용 등" />
      </FieldRow>
    </div>
  );
}

export function BudgetItemSheet({
  open,
  onClose,
  itemId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  itemId?: string | null;
  initial?: Partial<RowValues<"budget_items">>;
}) {
  const row = useWeddingStore((s) => (itemId ? s.data?.budget_items.find((t) => t.id === itemId) ?? null : null));
  const remove = useWeddingStore((s) => s.remove);
  const { values, set, commit, isEdit } = useEntityForm("budget_items", row, initial, open);

  const submit = () => {
    if (!values.name.trim()) return toast("항목 이름을 입력해 주세요.");
    commit({ name: values.name.trim() });
    toast("예산 항목이 추가되었어요.", { tone: "success" });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "예산 항목" : "비용 추가"}
      size="md"
      headerRight={isEdit ? <FavoriteButton active={values.is_favorite} onChange={(v) => set("is_favorite", v)} /> : undefined}
      footer={
        isEdit ? (
          <div className="flex gap-2">
            <DeleteButton
              onDelete={() => {
                if (row) remove("budget_items", row.id);
                onClose();
              }}
            />
            <Button full variant="secondary" onClick={onClose}>
              닫기
            </Button>
          </div>
        ) : (
          <Button full size="lg" onClick={submit}>
            추가하기
          </Button>
        )
      }
    >
      <BudgetItemFields row={row} values={values} set={set} isEdit={isEdit} />
    </Sheet>
  );
}
