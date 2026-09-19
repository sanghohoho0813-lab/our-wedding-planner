"use client";
import { Activity } from "lucide-react";
import { useNow } from "@/lib/hooks";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { ActivityRow } from "./ActivityRow";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/lib/store/ui-store";
import { EmptyState } from "@/components/ui/EmptyState";

export function RecentActivity({ limit = 6 }: { limit?: number }) {
  const logs = useWeddingStore((s) => s.data!.activity_logs);
  const wedding = useWeddingStore((s) => s.data!.wedding);
  const meId = useWeddingStore((s) => s.userId);
  const setSheet = useUIStore((st) => st.setHomeSheet);
  const now = useNow(30_000);
  const list = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  return (
    <Card>
      <CardHeader title="최근 활동" icon={<Activity />} action={<Button size="sm" variant="ghost" onClick={() => setSheet("activity")}>전체 보기</Button>} />
      {list.length === 0 ? (
        <EmptyState compact title="아직 기록이 없어요" description="할 일, 예산, 하객 정보를 수정하면 여기에 남아요." />
      ) : (
        <ul className="space-y-1 px-5 pb-5">
          {list.map((l) => (
            <ActivityRow key={l.id} log={l} wedding={wedding} meId={meId} now={now} className="py-1.5" />
          ))}
        </ul>
      )}
    </Card>
  );
}
