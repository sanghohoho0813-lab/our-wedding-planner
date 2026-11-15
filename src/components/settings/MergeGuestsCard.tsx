"use client";
import { Check, GitMerge, Upload } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { LOCAL_WEDDING_ID } from "@/lib/config";
import { MERGE_FIELDS, planGuestMerge, type GuestMergePlan } from "@/lib/db/merge-guests";
import { originalGuestLineage } from "@/lib/db/migration";
import type { Guest } from "@/lib/db/types";
import { SIDE_LABEL } from "@/lib/guest-side";
import { RSVP_LABEL } from "@/lib/labels";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/Sheet";

const people = (n: number | null | undefined) => `${1 + Math.max(0, n ?? 0)}명`;

/** "신랑측 → 공통 · 1명 → 2명" 처럼 무엇이 바뀌는지 */
function describeChange(target: Guest, patch: Partial<Guest>): string {
  const out: string[] = [];
  if (patch.side !== undefined) out.push(`${SIDE_LABEL[target.side]} → ${SIDE_LABEL[patch.side]}`);
  if (patch.companions !== undefined) out.push(`${people(target.companions)} → ${people(patch.companions)}`);
  if (patch.relation !== undefined) out.push(`관계 ${target.relation || "없음"} → ${patch.relation || "없음"}`);
  if (patch.rsvp !== undefined) out.push(`${RSVP_LABEL[target.rsvp]} → ${RSVP_LABEL[patch.rsvp]}`);
  if (patch.invitation_sent !== undefined) out.push(patch.invitation_sent ? "청첩장 전달" : "청첩장 전달 취소");
  if (patch.contacted !== undefined) out.push(patch.contacted ? "연락 완료" : "연락 전");
  if (patch.memo !== undefined) out.push("메모");
  if (patch.meal !== undefined || patch.invitation_method !== undefined) out.push("식사 · 청첩장 방식");
  return out.join(" · ");
}

const fieldsOf = (g: Partial<Guest>) => Object.fromEntries(MERGE_FIELDS.filter((f) => f in g).map((f) => [f, g[f]])) as Partial<Guest>;

/**
 * 다른 기기 백업에서 하객 합치기.
 *
 * Supabase 연결 전에 폰에서 따로 고치고 더한 하객을, 폰에서 받은 JSON 백업 하나로 지금 명단에 맞춘다.
 * 바로 바꾸지 않고 무엇이 바뀌는지 먼저 보여준다. 반영한 뒤에도 되돌릴 수 있다.
 */
export function MergeGuestsCard() {
  const data = useWeddingStore((s) => s.data!);
  const add = useWeddingStore((s) => s.add);
  const patch = useWeddingStore((s) => s.patch);
  const remove = useWeddingStore((s) => s.remove);
  const log = useWeddingStore((s) => s.log);
  const fileRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<GuestMergePlan | null>(null);
  // 꺼 둔 줄만 기억한다 (기본은 모두 반영)
  const [off, setOff] = useState<Set<string>>(new Set());
  const [movedToTasks, setMovedToTasks] = useState<string[]>([]);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text()) as { data?: { guests?: unknown; wedding?: { id?: string } }; guests?: unknown; wedding?: { id?: string } };
      const src = parsed.data ?? parsed;
      if (!Array.isArray(src.guests)) throw new Error("하객이 들어 있는 백업 파일(JSON)이 아니에요.");
      const ids = [LOCAL_WEDDING_ID, data.wedding.id, src.wedding?.id].filter((x): x is string => typeof x === "string" && !!x);
      // '해병대 인원 체크' 처럼 하객 칸에 적었던 메모를 이미 할 일로 옮겼으면 하객으로 다시 넣지 않는다
      const norm = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, "") : "");
      const taskTitles = new Set(data.tasks.map((t) => norm(t.title)));
      const asTask = (src.guests as Guest[]).filter((g) => taskTitles.has(norm(g.name)));
      const p = planGuestMerge(
        (src.guests as Guest[]).filter((g) => !taskTitles.has(norm(g.name))),
        data.guests,
        originalGuestLineage(ids),
      );
      setMovedToTasks(asTask.map((g) => g.name));
      if (p.add.length + p.update.length + p.remove.length === 0) {
        toast("합칠 것이 없어요. 백업의 하객이 이미 모두 들어 있어요.", { tone: "success" });
        return;
      }
      setOff(new Set());
      setPlan(p);
    } catch (e) {
      toast(e instanceof SyntaxError ? "JSON 백업 파일이 아니에요." : e instanceof Error ? e.message : "파일을 읽지 못했어요.", { tone: "error" });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const on = (k: string) => !off.has(k);
  const toggle = (k: string) =>
    setOff((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const adds = plan?.add.filter((g) => on(`a:${g.id}`)) ?? [];
  const updates = plan?.update.filter((u) => on(`u:${u.target.id}`)) ?? [];
  const removes = plan?.remove.filter((g) => on(`r:${g.id}`)) ?? [];
  const total = adds.length + updates.length + removes.length;

  const apply = () => {
    const created: string[] = [];
    const before: { id: string; prev: Partial<Guest> }[] = [];
    const removed: Guest[] = [];
    for (const g of adds) created.push(add("guests", fieldsOf(g), { log: false }).id);
    for (const u of updates) {
      before.push({ id: u.target.id, prev: Object.fromEntries(Object.keys(u.patch).map((k) => [k, u.target[k as keyof Guest]])) as Partial<Guest> });
      patch("guests", u.target.id, u.patch, { log: false });
    }
    for (const g of removes) {
      removed.push(g);
      remove("guests", g.id, { log: false, silent: true });
    }
    const parts = [adds.length && `${adds.length}명 추가`, updates.length && `${updates.length}명 고침`, removes.length && `${removes.length}명 정리`].filter(Boolean).join(" · ");
    log(`다른 기기 백업에서 하객을 합쳤어요 (${parts}).`, "guests", null, "update");
    toast(`하객을 합쳤어요 · ${parts}`, {
      tone: "success",
      duration: 10000,
      action: {
        label: "되돌리기",
        onClick: () => {
          for (const id of created) remove("guests", id, { log: false, silent: true });
          for (const b of before) patch("guests", b.id, b.prev, { log: false });
          for (const g of removed) add("guests", { ...fieldsOf(g), id: g.id }, { log: false });
        },
      },
    });
    setPlan(null);
  };

  const row = (k: string, title: string, sub: string) => (
    <li key={k}>
      <button
        type="button"
        role="checkbox"
        aria-checked={on(k)}
        onClick={() => toggle(k)}
        className={cn("flex w-full gap-3 px-3 py-2.5 text-left", !on(k) && "opacity-60")}
      >
        <span
          className={cn(
            "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2",
            on(k) ? "border-accent bg-accent text-accent-fg" : "border-line-strong",
          )}
        >
          {on(k) && <Check className="size-3.5" strokeWidth={3} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block break-keep text-[0.9375rem] font-medium text-fg">{title}</span>
          <span className="mt-0.5 block break-keep text-[0.8125rem] text-fg-3">{sub}</span>
        </span>
      </button>
    </li>
  );

  const section = (title: string, hint: string, items: ReactNode[]) =>
    items.length > 0 && (
      <section>
        <h3 className="text-[0.9375rem] font-semibold text-fg">
          {title} <span className="tabular text-fg-3">{items.length}</span>
        </h3>
        <p className="mb-1.5 text-[0.8125rem] text-fg-3">{hint}</p>
        <ul className="divide-y divide-line rounded-[14px] border border-line bg-surface">{items}</ul>
      </section>
    );

  return (
    <>
      <Card>
        <CardHeader title="다른 기기 백업에서 하객 합치기" icon={<GitMerge />} subtitle="폰에서 따로 적어 둔 하객을 지금 명단에 맞춰 넣어요" />
        <div className="space-y-2 px-5 pb-5">
          <p className="text-[0.875rem] text-fg-3">
            그 기기에서 받은 <b>JSON 백업</b>을 고르면, 새 사람은 더하고 부부로 합치거나 이름을 고친 사람은 같은 사람에 반영해요. 바꾸기 전에 목록을 먼저 보여드려요.
          </p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button full variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> 백업 파일 선택
          </Button>
        </div>
      </Card>

      <Sheet
        open={!!plan}
        onClose={() => setPlan(null)}
        title="하객 합치기"
        description="체크된 것만 반영해요. 반영한 뒤에도 되돌릴 수 있어요."
        footer={
          <Button full size="lg" onClick={apply} disabled={total === 0}>
            {total > 0 ? `${total}건 반영하기` : "고른 것이 없어요"}
          </Button>
        }
      >
        {plan && (
          <div className="space-y-5">
            {section(
              "새로 추가",
              "지금 명단에 없는 사람이에요.",
              plan.add.map((g) => row(`a:${g.id}`, g.name, `${SIDE_LABEL[g.side] ?? g.side} · ${g.relation || "관계 없음"} · ${people(g.companions)}`)),
            )}
            {section(
              "고쳐서 반영",
              "같은 사람인데 그 기기에서 이름 · 인원 · 측을 바꿨어요.",
              plan.update.map((u) =>
                row(`u:${u.target.id}`, u.patch.name && u.patch.name !== u.target.name ? `${u.target.name} → ${u.patch.name}` : u.target.name, describeChange(u.target, u.patch)),
              ),
            )}
            {section(
              "명단에서 정리",
              "그 기기에서 지운 사람이에요. 부부로 합치거나 다른 이름으로 다시 적으면서 지운 경우가 많아요.",
              plan.remove.map((g) => row(`r:${g.id}`, g.name, `${SIDE_LABEL[g.side] ?? g.side} · ${g.relation || "관계 없음"}`)),
            )}
            {movedToTasks.length > 0 && (
              <p className="rounded-[12px] bg-surface-2 px-3 py-2.5 text-[0.8125rem] text-fg-3">
                할 일로 이미 옮긴 메모는 하객으로 넣지 않아요: {movedToTasks.join(" · ")}
              </p>
            )}
            {plan.kept.length > 0 && (
              <p className="rounded-[12px] bg-surface-2 px-3 py-2.5 text-[0.8125rem] text-fg-3">
                지금 명단에서 이미 고친 사람은 그대로 둬요: {plan.kept.map((k) => k.target.name).join(" · ")}
              </p>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
