"use client";
import { Activity, Pencil, Plus, Trash2 } from "lucide-react";
import { relativeTime } from "@/lib/date";
import { useNow } from "@/lib/hooks";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/lib/store/ui-store";
import { EmptyState } from "@/components/ui/EmptyState";

export function RecentActivity({ limit = 6 }: { limit?: number }) {
  const logs = useWeddingStore((s) => s.data!.activity_logs);
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
            <li key={l.id} className="flex items-start gap-3 py-1.5">
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-3 [&>svg]:size-3.5">
                {l.action === "create" ? <Plus /> : l.action === "delete" ? <Trash2 /> : <Pencil />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] text-fg leading-snug">{l.description}</p>
                <p className="text-[0.75rem] text-fg-3">{now ? relativeTime(l.created_at, now) : ""}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
