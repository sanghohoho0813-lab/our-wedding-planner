"use client";
import { Check, Cloud, HardDrive, Loader2, Upload, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, SUPABASE_HOST } from "@/lib/config";
import { guestsMissingOnServer, readLocalWorkspace, uploadWorkspace, type LocalSnapshot } from "@/lib/db/handoff";
import { TABLE_NAMES, type Guest } from "@/lib/db/types";
import { SIDE_LABEL } from "@/lib/guest-side";
import { relativeTime } from "@/lib/date";
import { CSV_TABLE_LABEL } from "@/lib/export";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { useWorkspace } from "@/lib/store/workspace";
import { cn } from "@/lib/utils";
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

  // 이 브라우저에만 있는 하객 중 서버에 없는 사람 — 묶음(측 · 관계)별로 골라 올린다
  const add = useWeddingStore((s) => s.add);
  const remove = useWeddingStore((s) => s.remove);
  const log = useWeddingStore((s) => s.log);
  const missing = useMemo(() => (local ? guestsMissingOnServer(local.data.guests, data.guests) : []), [local, data.guests]);
  const groups = useMemo(() => {
    const m = new Map<string, { key: string; label: string; side: Guest["side"]; items: Guest[] }>();
    for (const g of missing) {
      const key = `${g.side}|${g.relation?.trim() || ""}`;
      const label = `${SIDE_LABEL[g.side] ?? g.side} · ${g.relation?.trim() || "관계 없음"}`;
      const grp = m.get(key) ?? { key, label, side: g.side, items: [] };
      grp.items.push(g);
      m.set(key, grp);
    }
    const order = { groom: 0, bride: 1, both: 2 } as Record<string, number>;
    return [...m.values()].sort((a, b) => (order[a.side] ?? 3) - (order[b.side] ?? 3) || b.items.length - a.items.length);
  }, [missing]);
  // 꺼 둔 묶음만 기억한다 (새로 보이는 묶음은 기본으로 켜져 있다)
  const [off, setOff] = useState<Set<string>>(new Set());
  const picked = groups.filter((g) => !off.has(g.key)).flatMap((g) => g.items);

  const moveGuests = () => {
    if (picked.length === 0) return;
    const created: string[] = [];
    for (const g of picked) {
      const row = add(
        "guests",
        {
          name: g.name,
          side: g.side,
          relation: g.relation,
          rsvp: g.rsvp,
          companions: g.companions,
          meal: g.meal,
          contacted: g.contacted,
          invitation_sent: g.invitation_sent,
          invitation_method: g.invitation_method,
          memo: g.memo,
        },
        { log: false },
      );
      created.push(row.id);
    }
    const n = created.length;
    log(`이 기기에만 있던 하객 ${n}명을 서버로 올렸어요.`, "guests", null, "create");
    toast(`하객 ${n}명을 올렸어요. 이제 상대도 볼 수 있어요.`, {
      tone: "success",
      duration: 8000,
      action: {
        label: "되돌리기",
        onClick: () => {
          for (const id of created) remove("guests", id, { log: false, silent: true });
        },
      },
    });
  };

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
                  {CSV_TABLE_LABEL[c.table] ?? c.table} {c.n}
                </li>
              ))}
            </ul>

            {/* 대개 필요한 건 '폰에서 따로 적어 둔 하객' 뿐이다 — 그것만 골라 올린다 */}
            {groups.length > 0 && (
              <div className="space-y-2.5 rounded-[14px] border border-line p-3">
                <p className="flex items-center gap-1.5 text-[1rem] font-semibold text-fg">
                  <Users className="size-4 text-fg-3" /> 서버에 없는 하객 {missing.length}명
                </p>
                <p className="text-[0.875rem] text-fg-3">이름과 측이 같은 사람은 이미 있으니 뺐어요. 올릴 묶음만 고르세요.</p>
                <ul className="space-y-1.5">
                  {groups.map((g) => {
                    const on = !off.has(g.key);
                    return (
                      <li key={g.key}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() =>
                            setOff((prev) => {
                              const next = new Set(prev);
                              if (on) next.add(g.key);
                              else next.delete(g.key);
                              return next;
                            })
                          }
                          className={cn(
                            "flex w-full gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors",
                            on ? "border-accent/50 bg-accent-softer" : "border-line bg-surface",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2",
                              on ? "border-accent bg-accent text-accent-fg" : "border-line-strong",
                            )}
                          >
                            {on && <Check className="size-3.5" strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block text-[0.9375rem] font-semibold", on ? "text-fg" : "text-fg-3")}>
                              {g.label} <span className="tabular">{g.items.length}명</span>
                            </span>
                            <span className="mt-0.5 block break-keep text-[0.8125rem] text-fg-3">{g.items.map((x) => x.name).join(" · ")}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <Button full onClick={moveGuests} disabled={picked.length === 0}>
                  <Upload className="size-4" /> {picked.length > 0 ? `고른 하객 ${picked.length}명만 서버로 올리기` : "고른 묶음이 없어요"}
                </Button>
              </div>
            )}

            {movedAt ? (
              <p className="rounded-[12px] bg-success-soft px-4 py-3 text-[0.9375rem] text-success">
                {relativeTime(movedAt)}에 서버로 올렸어요. (브라우저 기록은 백업으로 그대로 둡니다)
              </p>
            ) : (
              <>
                <Button full variant={groups.length > 0 ? "outline" : "primary"} onClick={move} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} 기록 전체 올리기 ({local.rows}건)
                </Button>
                <p className="text-[0.875rem] text-fg-3">
                  전체 올리기는 할 일 · 예산까지 모두 더해요. 서버에 이미 있는 것도 한 번 더 들어가니, 하객만 옮기려면 위의 버튼을 쓰세요.
                </p>
              </>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
