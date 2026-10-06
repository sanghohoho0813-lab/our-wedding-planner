"use client";
import { Mail, MessageCircle, UserCheck, UserMinus } from "lucide-react";
import type { Guest, Rsvp } from "@/lib/db/types";
import { toast } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { josa } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";

type Field = "invitation_sent" | "rsvp" | "contacted";

/**
 * 하객 묶음(예: 신부측 · 직장동료 8명) 을 한 번에 처리한다.
 *
 * 청첩장은 보통 모임 단위로 한꺼번에 건넨다. 그런데 앱에서는 한 사람씩 눌러야 해서
 * 8명이면 8번을 눌렀다. 여기서는 묶음 머리글의 [⋯] → 한 번이면 끝난다.
 * 바뀌는 사람만 고치고, 되돌리기를 준다.
 */
export function GroupActionsSheet({
  title,
  guests,
  open,
  onClose,
}: {
  title: string;
  guests: Guest[];
  open: boolean;
  onClose: () => void;
}) {
  const patch = useWeddingStore((s) => s.patch);
  const log = useWeddingStore((s) => s.log);

  const notSent = guests.filter((g) => !g.invitation_sent);
  const notYes = guests.filter((g) => g.rsvp !== "yes");
  const notMaybe = guests.filter((g) => g.rsvp !== "maybe");
  const notContacted = guests.filter((g) => !g.contacted);

  const run = (targets: Guest[], field: Field, value: boolean | Rsvp, done: string) => {
    if (targets.length === 0) return onClose();
    const before = targets.map((g) => ({ id: g.id, value: g[field] }));
    for (const g of targets) patch("guests", g.id, { [field]: value } as Partial<Guest>, { log: false });
    log(`${title} ${targets.length}명을 ${josa(done, "(으)로")} 바꿨어요.`, "guests", null, "update");
    toast(`${targets.length}명을 ${josa(done, "(으)로")} 바꿨어요.`, {
      tone: "success",
      duration: 7000,
      action: {
        label: "되돌리기",
        onClick: () => {
          for (const b of before) patch("guests", b.id, { [field]: b.value } as Partial<Guest>, { log: false });
        },
      },
    });
    onClose();
  };

  const actions = [
    { icon: <Mail />, label: "청첩장 전달로", count: notSent.length, onClick: () => run(notSent, "invitation_sent", true, "청첩장 전달") },
    { icon: <UserCheck />, label: "모두 참석으로", count: notYes.length, onClick: () => run(notYes, "rsvp", "yes", "참석") },
    { icon: <UserMinus />, label: "모두 미정으로", count: notMaybe.length, onClick: () => run(notMaybe, "rsvp", "maybe", "미정") },
    { icon: <MessageCircle />, label: "연락 완료로", count: notContacted.length, onClick: () => run(notContacted, "contacted", true, "연락 완료") },
  ];

  return (
    <Sheet open={open} onClose={onClose} title={title} description={`${guests.length}명을 한 번에`} size="sm">
      <ul className="grid gap-2">
        {actions.map((a) => (
          <li key={a.label}>
            <button
              type="button"
              disabled={a.count === 0}
              onClick={a.onClick}
              className="flex w-full items-center gap-3 rounded-[14px] border border-line bg-surface px-4 py-3 text-left transition hover:border-line-strong hover:bg-surface-2 active:scale-[0.99] disabled:opacity-45"
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-accent-softer text-accent-text [&>svg]:size-5">{a.icon}</span>
              <span className="min-w-0 flex-1 text-[1rem] font-semibold text-fg">{a.label}</span>
              <span className="shrink-0 text-[0.9375rem] tabular text-fg-3">{a.count > 0 ? `${a.count}명 바뀜` : "이미 모두"}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
