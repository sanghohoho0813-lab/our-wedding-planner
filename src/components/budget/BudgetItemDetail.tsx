"use client";
import { Trash2, Wallet } from "lucide-react";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { IconButton } from "@/components/ui/Button";
import { FavoriteButton } from "@/components/ui/FavoriteButton";
import { DetailCard, DetailPlaceholder } from "@/components/layout/MasterDetail";
import { useEntityForm } from "@/components/shared/useEntityForm";
import { BudgetItemFields } from "./BudgetItemSheet";

export function BudgetItemDetail({ itemId }: { itemId: string | null }) {
  const row = useWeddingStore((s) => (itemId ? s.data?.budget_items.find((i) => i.id === itemId) ?? null : null));
  const remove = useWeddingStore((s) => s.remove);
  const { values, set } = useEntityForm("budget_items", row, undefined, true);

  if (!row) {
    return <DetailPlaceholder icon={<Wallet />} title="예산 항목을 선택해 주세요" description="목록에서 항목을 누르면 여기에서 견적 · 실제 금액 · 결제를 바로 고칠 수 있어요." />;
  }
  return (
    <DetailCard
      title={row.name}
      actions={
        <>
          <FavoriteButton active={values.is_favorite} onChange={(v) => set("is_favorite", v)} />
          <IconButton label="삭제" onClick={() => remove("budget_items", row.id)} className="hover:text-danger">
            <Trash2 className="size-[1.125rem]" />
          </IconButton>
        </>
      }
    >
      <BudgetItemFields row={row} values={values} set={set} isEdit />
    </DetailCard>
  );
}
