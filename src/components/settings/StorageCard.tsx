"use client";
import { Cloud, HardDrive, Loader2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, SUPABASE_HOST } from "@/lib/config";
import { readLocalWorkspace, uploadWorkspace, type LocalSnapshot } from "@/lib/db/handoff";
import { TABLE_NAMES } from "@/lib/db/types";
import { relativeTime } from "@/lib/date";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { useWorkspace } from "@/lib/store/workspace";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

const MIGRATED_KEY = "owp:localMovedAt";

/**
 * "지금 내 기록이 어디에 저장되고 있나?"
 *
 * 둘이 같이 쓰려면 서버(Supabase)에 저장돼야 하는데, 화면만 봐서는 알 수가 없다.
 * 그래서 어디에 저장 중인지 · 지금 몇 건이 올라가 있는지 · 못 보낸 게 있는지를 한 카드에 적는다.
 *
 * 그리고 예전에 '로컬 저장 모드' 로 쓰던 기록이 이 브라우저에 남아 있으면 그것도 알려준다.
 * 그 기록은 서버에 없으니 상대는 볼 수 없고, 브라우저 데이터를 지우면 함께 사라진다.
 */
export function StorageCard() {
  const ws = useWorkspace();
  const data = useWeddingStore((s) => s.data!);
  const adapter = useWeddingStore((s) => s.adapter);
  const reload = useWeddingStore((s) => s.reload);
  const queued = useWeddingStore((s) => s.queued);
  const lastSavedAt = useWeddingStore((s) => s.lastSavedAt);
  const realtime = useWeddingStore((s) => s.realtime);
  const [local, setLocal] = useState<LocalSnapshot | null>(null);
  const [movedAt, setMovedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 서버 모드일 때만 의미가 있다 (로컬 모드면 그게 곧 지금 쓰는 기록이다)
    if (!isSupabaseConfigured) return;
    setLocal(readLocalWorkspace());
    try {
      setMovedAt(localStorage.getItem(MIGRATED_KEY));
    } catch {
      /* 저장소가 막혀 있어도 카드는 보여준다 */
    }
  }, []);

  const rows = TABLE_NAMES.filter((t) => t !== "activity_logs").reduce((n, t) => n + (data[t] as unknown[]).length, 0);

  const move = async () => {
    if (!local || !adapter || !ws.weddingId) return;
    setBusy(true);
    try {
      // 서버 것을 지우지 않는다. 이 기기에만 있던 기록을 **더한다**.
      const n = await uploadWorkspace(adapter, ws.weddingId, ws.userId, local.data, { wedding: false });
      await reload();
      const at = new Date().toISOString();
      try {
        localStorage.setItem(MIGRATED_KEY, at);
      } catch {
        /* 표시만 못 할 뿐이다 */
      }
      setMovedAt(at);
      toast(`이 기기에 있던 ${n}건을 서버로 올렸어요. 이제 상대도 볼 수 있어요.`, { tone: "success", duration: 8000 });
    } catch (e) {
      toast(e instanceof Error ? e.message : "올리지 못했어요.", { tone: "error", duration: 8000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title="지금 저장되는 곳"
          icon={isSupabaseConfigured ? <Cloud /> : <HardDrive />}
          subtitle={isSupabaseConfigured ? "둘이 같이 보는 서버에 저장돼요" : "이 기기 안에만 저장돼요"}
        />
        <div className="space-y-3 px-5 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            {isSupabaseConfigured ? (
              <>
                <Badge tone="success">서버 저장</Badge>
                <span className="text-[0.9375rem] text-fg-2">{SUPABASE_HOST || "Supabase"}</span>
              </>
            ) : (
              <>
                <Badge tone="warning">이 기기에만 저장</Badge>
                <span className="text-[0.9375rem] text-fg-2">브라우저 저장소</span>
              </>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-2 text-[0.9375rem]">
            <div className="rounded-[12px] bg-surface-2 px-3 py-2">
              <dt className="text-[0.8125rem] text-fg-3">지금 불러온 기록</dt>
              <dd className="font-semibold tabular text-fg">{rows.toLocaleString("ko-KR")}건</dd>
            </div>
            <div className="rounded-[12px] bg-surface-2 px-3 py-2">
              <dt className="text-[0.8125rem] text-fg-3">마지막 저장</dt>
              <dd className="font-semibold text-fg">{lastSavedAt ? relativeTime(new Date(lastSavedAt).toISOString()) : "—"}</dd>
            </div>
            {isSupabaseConfigured && (
              <>
                <div className="rounded-[12px] bg-surface-2 px-3 py-2">
                  <dt className="text-[0.8125rem] text-fg-3">로그인</dt>
                  <dd className="truncate font-semibold text-fg">{ws.email ?? ws.name ?? "—"}</dd>
                </div>
                <div className="rounded-[12px] bg-surface-2 px-3 py-2">
                  <dt className="text-[0.8125rem] text-fg-3">실시간 연결</dt>
                  <dd className={`font-semibold ${realtime === "live" ? "text-success" : "text-warning"}`}>{realtime === "live" ? "연결됨" : realtime === "connecting" ? "연결 중" : "끊김"}</dd>
                </div>
              </>
            )}
          </dl>

          {queued > 0 && (
            <p className="rounded-[12px] border border-warning/50 bg-warning-soft px-4 py-3 text-[0.9375rem] text-fg">
              아직 서버로 못 보낸 수정이 <b>{queued}건</b> 있어요. 연결되면 자동으로 저장돼요.
            </p>
          )}
        </div>
      </Card>

      {/* 예전에 이 브라우저에만 쌓아둔 기록이 남아 있으면 구조한다 */}
      {isSupabaseConfigured && local && local.rows > 0 && (
        <Card>
          <CardHeader
            title="이 브라우저에만 남아 있는 기록"
            icon={<HardDrive />}
            subtitle={`${local.rows}건 · ${local.updatedAt ? relativeTime(local.updatedAt) + " 수정" : "수정 시각 모름"}`}
          />
          <div className="space-y-3 px-5 pb-5">
            <p className="text-[0.9375rem] text-fg-2">
              Supabase를 연결하기 전에 이 기기에서 쓰던 기록이에요. <b>서버에는 없어서 상대는 볼 수 없고</b>, 브라우저 데이터를 지우면 같이 사라져요.
            </p>
            <ul className="flex flex-wrap gap-1.5 text-[0.875rem] text-fg-3">
              {local.counts.slice(0, 8).map((c) => (
                <li key={c.table} className="rounded-full bg-surface-2 px-2.5 py-1">
                  {c.table} {c.n}
                </li>
              ))}
            </ul>
            {movedAt ? (
              <p className="rounded-[12px] bg-success-soft px-4 py-3 text-[0.9375rem] text-success">
                {relativeTime(movedAt)}에 서버로 올렸어요. (브라우저 기록은 백업으로 그대로 둡니다)
              </p>
            ) : (
              <>
                <Button full onClick={move} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} 서버로 올리기 ({local.rows}건)
                </Button>
                <p className="text-[0.875rem] text-fg-3">지금 서버에 있는 기록은 지우지 않고 더합니다. 겹치는 항목이 생기면 지운 뒤 다시 정리할 수 있어요.</p>
              </>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
