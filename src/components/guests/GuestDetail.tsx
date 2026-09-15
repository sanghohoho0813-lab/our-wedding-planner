"use client";
import { Trash2, Users } from "lucide-react";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { IconButton } from "@/components/ui/Button";
import { DetailCard, DetailPlaceholder } from "@/components/layout/MasterDetail";
import { useEntityForm } from "@/components/shared/useEntityForm";
import { GuestFields } from "./GuestSheet";

export function GuestDetail({ guestId }: { guestId: string | null }) {
  const row = useWeddingStore((s) => (guestId ? s.data?.guests.find((g) => g.id === guestId) ?? null : null));
  const remove = useWeddingStore((s) => s.remove);
  const { values, set } = useEntityForm("guests", row, undefined, true);

  if (!row) {
    return <DetailPlaceholder icon={<Users />} title="하객을 선택해 주세요" description="목록에서 이름을 누르면 여기에서 참석 · 동반 인원 · 청첩장을 바로 고칠 수 있어요." />;
  }
  return (
    <DetailCard
      title={row.name}
      actions={
        <IconButton label="삭제" onClick={() => remove("guests", row.id)} className="hover:text-danger">
          <Trash2 className="size-[1.125rem]" />
        </IconButton>
      }
    >
      <GuestFields values={values} set={set} isEdit />
    </DetailCard>
  );
}
