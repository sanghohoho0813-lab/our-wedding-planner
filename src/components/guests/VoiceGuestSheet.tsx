"use client";
import { Mic, Plus, X } from "lucide-react";
import { useState } from "react";
import { useSpeech } from "@/lib/speech";
import { parsePhrase, RELATION_OPTIONS } from "@/lib/voice-guest";
import { GUEST_SIDES } from "@/lib/guest-side";
import type { GuestSide } from "@/lib/db/types";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { toast } from "@/lib/store/ui-store";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { inputCls } from "@/components/ui/Field";
import { MicButton } from "@/components/ui/MicButton";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { Stepper } from "@/components/ui/Stepper";

interface Draft {
  key: string;
  name: string;
  side: GuestSide;
  relation: string | null;
  companions: number;
}

/**
 * 말로 하객 여러 명 넣기.
 *
 * 한 명씩 이름을 말하고 잠깐 쉬면 한 줄씩 쌓인다. 쌓인 목록을 눈으로 보고
 * 고친 다음에 한 번에 저장한다 — 바로 저장하지 않는 게 핵심이다.
 * 사람 이름은 음성 인식이 곧잘 틀려서, 확인 없이 넣으면 나중에 치우는 일이 더 커진다.
 */
export function VoiceGuestSheet({ open, onClose, defaultSide = "groom" }: { open: boolean; onClose: () => void; defaultSide?: GuestSide }) {
  const add = useWeddingStore((s) => s.add);
  const [side, setSide] = useState<GuestSide>(defaultSide);
  const [relation, setRelation] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const speech = useSpeech({
    onPhrase: (text) => {
      const p = parsePhrase(text);
      if (!p) return;
      // 말 속에 '신부측' · '직장' 같은 게 섞여 있으면 그 뒤로는 그게 기본값이 된다
      if (p.side) setSide(p.side);
      if (p.relation) setRelation(p.relation);
      setDrafts((prev) => [
        ...prev,
        {
          key: `${Date.now()}-${prev.length}`,
          name: p.name,
          side: p.side ?? side,
          relation: p.relation ?? relation,
          companions: p.companions ?? 0,
        },
      ]);
    },
  });

  const close = () => {
    speech.stop();
    setDrafts([]);
    onClose();
  };

  const save = () => {
    const rows = drafts.filter((d) => d.name.trim());
    for (const d of rows) add("guests", { name: d.name.trim(), side: d.side, relation: d.relation, companions: d.companions }, { log: false });
    if (rows.length) toast(`하객 ${rows.length}명을 추가했어요.`, { tone: "success" });
    close();
  };

  const patch = (key: string, p: Partial<Draft>) => setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...p } : d)));

  return (
    <Sheet
      open={open}
      onClose={close}
      title="말로 하객 추가"
      description="한 명씩 이름을 말하고 잠깐 쉬면 한 줄씩 쌓여요"
      footer={
        <Button full size="lg" onClick={save} disabled={drafts.length === 0}>
          {drafts.length > 0 ? `${drafts.length}명 추가하기` : "추가하기"}
        </Button>
      }
    >
      {!speech.supported ? (
        <div className="space-y-3">
          <p className="text-[1rem] text-fg-2 leading-relaxed">이 브라우저에서는 말로 입력하는 기능을 쓸 수 없어요.</p>
          <p className="text-[0.9375rem] text-fg-3 leading-relaxed">
            안드로이드 크롬에서 잘 됩니다. 아이폰이라면 키보드의 마이크 버튼을 눌러 <b className="text-fg-2">한 줄로 추가</b> 칸에
            말해도 같은 결과가 돼요.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 이름이 쌓이기 시작하면 마이크 안내는 제 할 일을 다 했다. 작게 줄여서
              화면을 담긴 목록에 내준다 — 고쳐야 할 건 이름이지 안내문이 아니다. */}
          {drafts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[16px] border border-line bg-surface-2 px-4 py-5">
              <MicButton listening={speech.listening} onClick={speech.toggle} className="size-16 [&>svg]:size-6" />
              <p className="min-h-[1.5rem] text-center text-[0.9375rem] text-fg-2">
                {speech.error ? (
                  <span className="text-danger">{speech.error}</span>
                ) : speech.listening ? (
                  speech.interim || "듣고 있어요. 이름을 말해 보세요."
                ) : (
                  "마이크를 누르고 이름을 말하세요."
                )}
              </p>
              {speech.oneShot && (
                <p className="text-center text-[0.8125rem] text-fg-3">아이폰은 한 명 말할 때마다 마이크를 다시 눌러주세요.</p>
              )}
              <p className="text-center text-[0.75rem] leading-relaxed text-fg-3">
                예: &ldquo;신부측 직장 김미영&rdquo; · &ldquo;양가 친구 박준영&rdquo; · &ldquo;이철수 부부&rdquo;
                <br />
                소리는 브라우저가 글자로 바꾸는 데만 쓰이고, 앱에 저장되지 않아요.
              </p>
            </div>
          ) : (
            <div className="sticky top-0 z-10 -mx-1 flex items-center gap-3 rounded-[14px] border border-line bg-surface-2 px-3 py-2">
              <MicButton listening={speech.listening} onClick={speech.toggle} />
              <p className="min-w-0 flex-1 truncate text-[0.875rem] text-fg-2">
                {speech.error ? (
                  <span className="text-danger">{speech.error}</span>
                ) : speech.listening ? (
                  speech.interim || "듣고 있어요…"
                ) : (
                  speech.oneShot ? "다음 사람을 말하려면 다시 누르세요." : "이어서 말하려면 누르세요."
                )}
              </p>
              <span className="shrink-0 text-[0.875rem] font-semibold tabular text-fg">{drafts.length}명</span>
            </div>
          )}

          <div className="space-y-2">
            {drafts.length === 0 && <p className="text-[0.875rem] font-medium text-fg-2">다음에 담을 기본값</p>}
            <Segmented
              size="sm"
              options={GUEST_SIDES.map((o) => ({ value: o.value, label: o.label }))}
              value={side}
              onChange={setSide}
              ariaLabel="기본 측"
            />
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              <Chip size="sm" active={relation === null} onClick={() => setRelation(null)}>
                관계 없음
              </Chip>
              {RELATION_OPTIONS.map((r) => (
                <Chip key={r} size="sm" active={relation === r} onClick={() => setRelation(relation === r ? null : r)}>
                  {r}
                </Chip>
              ))}
            </div>
          </div>

          {drafts.length > 0 && (
            <ul className="space-y-2">
              {drafts.map((d) => (
                <li key={d.key} className="rounded-[14px] border border-line bg-surface p-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={d.name}
                      onChange={(e) => patch(d.key, { name: e.target.value })}
                      aria-label="하객 이름"
                      className={`${inputCls} h-10`}
                    />
                    <button
                      type="button"
                      aria-label={`${d.name} 빼기`}
                      onClick={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-fg-3 hover:bg-danger-soft hover:text-danger"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {GUEST_SIDES.map((o) => (
                      <Chip key={o.value} size="sm" active={d.side === o.value} onClick={() => patch(d.key, { side: o.value })}>
                        {o.label}
                      </Chip>
                    ))}
                    <span className="mx-1 h-4 w-px bg-line" />
                    <span className="text-[0.8125rem] text-fg-3">{d.relation ?? "관계 없음"}</span>
                    <span className="ml-auto flex items-center gap-1.5 text-[0.8125rem] text-fg-3">
                      <span className="font-semibold tabular text-fg-2">{1 + d.companions}명</span>
                      <Stepper value={d.companions} onChange={(v) => patch(d.key, { companions: v })} min={0} max={9} suffix="" size="sm" />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() =>
              setDrafts((prev) => [...prev, { key: `${Date.now()}-${prev.length}`, name: "", side, relation, companions: 0 }])
            }
            className="flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-line py-2.5 text-[0.875rem] text-fg-3 hover:border-line-strong hover:text-fg-2"
          >
            <Plus className="size-4" /> 손으로 한 줄 더
          </button>

          {drafts.length === 0 && !speech.listening && (
            <p className="flex items-center justify-center gap-1.5 py-2 text-[0.875rem] text-fg-3">
              <Mic className="size-4" /> 아직 담긴 이름이 없어요.
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
