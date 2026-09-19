"use client";
import { UserRound } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/config";
import { readMembers, SIDE_LABEL, withMember, type Side } from "@/lib/members";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { useWorkspace } from "@/lib/store/workspace";
import { Card, CardHeader } from "@/components/ui/Card";
import { FieldRow, TextField } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";

/**
 * "나는 신랑" / "나는 신부".
 * 이걸 정해두면 활동 기록에 이름이 뜨고, 할 일을 내 담당만 골라 볼 수 있다.
 */
export function WhoAmI() {
  const ws = useWorkspace();
  const wedding = useWeddingStore((s) => s.data!.wedding);
  const updateWedding = useWeddingStore((s) => s.updateWedding);
  const userId = ws.userId;
  const members = readMembers(wedding);
  const me = userId ? members[userId] : undefined;
  const partner = Object.entries(members).find(([id]) => id !== userId)?.[1];

  const save = (patch: { name?: string; side?: Side }) => {
    if (!userId) return;
    updateWedding(
      { details: { ...(wedding.details ?? {}), members: withMember(wedding, userId, patch) } },
      { log: false },
    );
  };

  const sideFromNames = (side: Side) => (side === "groom" ? wedding.groom_name : wedding.bride_name).trim();

  return (
    <Card>
      <CardHeader
        title="나는 누구인가요?"
        icon={<UserRound />}
        subtitle="할 일을 '내 담당'으로 골라 볼 수 있어요"
      />
      <div className="space-y-4 px-5 pb-5">
        <FieldRow label="내 이름">
          <TextField
            value={me?.name ?? ""}
            onChange={(v) => save({ name: v })}
            placeholder={ws.email?.split("@")[0] ?? "이름"}
            leftIcon={<UserRound />}
          />
        </FieldRow>
        <FieldRow label="나는">
          <Segmented
            ariaLabel="신랑 신부 선택"
            value={me?.side ?? ("" as Side | "")}
            onChange={(v) => save({ side: v as Side })}
            options={[
              { value: "groom" as const, label: sideFromNames("groom") ? `신랑 · ${sideFromNames("groom")}` : "신랑" },
              { value: "bride" as const, label: sideFromNames("bride") ? `신부 · ${sideFromNames("bride")}` : "신부" },
            ]}
          />
        </FieldRow>
        <p className="text-[0.875rem] text-fg-3">
          {partner?.name
            ? `함께 쓰는 사람: ${partner.name}${partner.side ? ` (${SIDE_LABEL[partner.side]})` : ""}`
            : isSupabaseConfigured
              ? "상대가 참여하면 여기에 이름이 보여요."
              : "Supabase를 연결하면 상대의 이름도 함께 보여요."}
        </p>
      </div>
    </Card>
  );
}
