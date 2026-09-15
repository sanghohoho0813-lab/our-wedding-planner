"use client";
import { Activity, Pencil, Plus, Star, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { relativeTime } from "@/lib/date";
import { useNow } from "@/lib/hooks";
import { useUIStore } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { MemoSheet } from "@/components/memos/MemoSheet";
import { useFavorites } from "@/components/home/Favorites";

/** 메모 · 즐겨찾기 · 최근 활동은 독립 메뉴 대신 홈 위젯과 이 시트에서 본다. */
export function HomeSheets() {
  const sheet = useUIStore((s) => s.homeSheet);
  const setSheet = useUIStore((s) => s.setHomeSheet);
  const memos = useWeddingStore((s) => s.data!.memos);
  const logs = useWeddingStore((s) => s.data!.activity_logs);
  const remove = useWeddingStore((s) => s.remove);
  const favs = useFavorites();
  const now = useNow(30_000);
  const [editId, setEditId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const close = () => setSheet(null);

  return (
    <>
      <Sheet
        open={sheet === "memos"}
        onClose={close}
        title="메모함"
        description="떠오른 생각을 적어두고 할 일 · 일정 · 예산으로 바꿔요"
        headerRight={
          <Button size="sm" variant="soft" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> 메모
          </Button>
        }
      >
        {memos.length === 0 ? (
          <EmptyState compact icon={<StickyNote />} title="메모가 비어 있어요" description="갑자기 떠오른 생각을 적어두세요." actionLabel="첫 메모 작성" onAction={() => setCreating(true)} />
        ) : (
          <ul className="space-y-2">
            {[...memos].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((m) => (
              <li key={m.id} className="flex items-start gap-2 rounded-[12px] border border-line bg-surface p-3">
                <button type="button" onClick={() => setEditId(m.id)} className="min-w-0 flex-1 text-left">
                  <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-fg">{m.content}</p>
                  <p className="mt-1 text-[0.75rem] text-fg-3">{now ? relativeTime(m.created_at, now) : ""}</p>
                </button>
                <button type="button" aria-label="삭제" onClick={() => remove("memos", m.id)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-fg-3 hover:bg-danger-soft hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <Sheet open={sheet === "favorites"} onClose={close} title="즐겨찾기" description="자주 확인하는 항목">
        {favs.length === 0 ? (
          <EmptyState compact icon={<Star />} title="즐겨찾기한 항목이 없어요" description="카드의 별표를 눌러 추가할 수 있어요." />
        ) : (
          <ul className="divide-y divide-line">
            {favs.map((f) => (
              <li key={f.key}>
                <Link href={f.href} onClick={close} className="flex items-center gap-3 py-3">
                  <Star className="size-4 shrink-0 fill-warning text-warning" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[1rem] font-medium text-fg">{f.title}</span>
                    <span className="block truncate text-[0.8125rem] text-fg-3">{[f.kind, f.sub].filter(Boolean).join(" · ")}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <Sheet open={sheet === "activity"} onClose={close} title="최근 활동" description="두 사람이 남긴 변경 기록">
        {logs.length === 0 ? (
          <EmptyState compact icon={<Activity />} title="아직 기록이 없어요" description="무언가를 수정하면 여기에 남아요." />
        ) : (
          <ul className="divide-y divide-line">
            {[...logs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 80).map((l) => (
              <li key={l.id} className="flex items-start gap-3 py-3">
                <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-fg-3 [&>svg]:size-3.5">
                  {l.action === "create" ? <Plus /> : l.action === "delete" ? <Trash2 /> : <Pencil />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] text-fg">{l.description}</p>
                  <p className="text-[0.75rem] text-fg-3">{now ? relativeTime(l.created_at, now) : ""}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      <MemoSheet open={creating || !!editId} onClose={() => { setCreating(false); setEditId(null); }} memoId={editId} />
    </>
  );
}
