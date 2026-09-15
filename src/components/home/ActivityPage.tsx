"use client";
import { Activity, Pencil, Plus, Trash2 } from "lucide-react";
import { formatKoreanDate, relativeTime, todayISO } from "@/lib/date";
import { useNow } from "@/lib/hooks";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";

export function ActivityPage() {
  const logs = useWeddingStore((s) => s.data!.activity_logs);
  const now = useNow(30_000);
  const sorted = [...logs].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const groups = new Map<string, typeof sorted>();
  for (const l of sorted) {
    const day = todayISO(new Date(l.created_at));
    groups.set(day, [...(groups.get(day) ?? []), l]);
  }
  const today = todayISO();
  return (
    <div>
      <PageHeader title="최근 활동" description="두 사람이 남긴 변경 기록" />
      {sorted.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Activity />} title="아직 기록이 없어요" description="할 일, 예산, 하객 정보를 수정하면 여기에 남아요." />
        </div>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([day, items]) => (
            <section key={day} className="card overflow-hidden">
              <h2 className="border-b border-line px-4 py-2 text-[0.75rem] font-semibold text-fg-3">{day === today ? "오늘" : formatKoreanDate(day)}</h2>
              <ul className="divide-y divide-line">
                {items.map((l) => (
                  <li key={l.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-3 [&>svg]:size-3.5">
                      {l.action === "create" ? <Plus /> : l.action === "delete" ? <Trash2 /> : <Pencil />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.9375rem] text-fg">{l.description}</p>
                      <p className="text-[0.6875rem] text-fg-3">{now ? relativeTime(l.created_at, now) : ""}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
