"use client";
import { StickyNote } from "lucide-react";
import { useState } from "react";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { relativeTime } from "@/lib/date";
import { useNow } from "@/lib/hooks";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/lib/store/ui-store";
import { MemoSheet } from "@/components/memos/MemoSheet";

export function MemoInbox({ limit = 4 }: { limit?: number }) {
  const memos = useWeddingStore((s) => s.data!.memos);
  const setSheet = useUIStore((st) => st.setHomeSheet);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const now = useNow(30_000);
  const list = [...memos].filter((m) => !m.converted_to).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  return (
    <Card>
      <CardHeader
        title="메모함"
        icon={<StickyNote />}
        action={
          <span className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setSheet("memos")}>
              전체 보기
            </Button>
            <Button size="sm" variant="soft" onClick={() => setOpen(true)}>
              + 메모
            </Button>
          </span>
        }
      />
      {list.length === 0 ? (
        <EmptyState compact title="메모가 비어 있어요" description="떠오른 생각을 적어두고 나중에 정리해요." />
      ) : (
        <ul className="px-2 pb-2">
          {list.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => setEditId(m.id)} className="flex w-full items-start gap-3 rounded-[12px] px-3 py-2.5 text-left hover:bg-surface-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[0.9375rem] text-fg">{m.content}</span>
                  <span className="block text-[0.75rem] text-fg-3">{now ? relativeTime(m.created_at, now) : ""}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <MemoSheet open={open || !!editId} onClose={() => { setOpen(false); setEditId(null); }} memoId={editId} />
    </Card>
  );
}
