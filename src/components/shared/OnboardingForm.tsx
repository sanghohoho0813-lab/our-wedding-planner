"use client";
import { Check, Database, FileUp, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DEFAULT_WEDDING_DATE } from "@/lib/config";
import { buildMigratedData, MIGRATION_TOTAL, ORIGINAL_WEDDING } from "@/lib/db/migration";
import { readLocalWorkspace, uploadWorkspace, type LocalSnapshot } from "@/lib/db/handoff";
import { SupabaseAdapter } from "@/lib/db/supabase";
import { formatKoreanDate } from "@/lib/date";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { DateField, FieldRow, inputCls } from "@/components/ui/Field";
import { MoneyField } from "@/components/ui/MoneyField";
import { Segmented } from "@/components/ui/Segmented";

type Seed = "local" | "original" | "empty";

/**
 * 초대 코드는 링크(?code=)로 들어온다. 그런데 가입 → 이메일 인증 → 돌아오기 를 거치면
 * 그 링크가 사라져서 코드를 다시 물어보게 된다. 한 번 받은 코드는 이 기기에 적어 둔다.
 */
const INVITE_KEY = "owp:inviteCode";
function rememberInvite(code: string) {
  try {
    if (code) localStorage.setItem(INVITE_KEY, code);
  } catch {
    /* 저장이 막혀 있어도 직접 입력하면 된다 */
  }
}
function recallInvite(): string {
  try {
    return localStorage.getItem(INVITE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function OnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const invited = (params.get("code") ?? "").toUpperCase();
  const [tab, setTab] = useState<"create" | "join">(invited ? "join" : "create");
  const [name, setName] = useState<string>(ORIGINAL_WEDDING.name);
  const [date, setDate] = useState<string | null>(ORIGINAL_WEDDING.wedding_date || DEFAULT_WEDDING_DATE);
  const [groom, setGroom] = useState("");
  const [bride, setBride] = useState("");
  const [budget, setBudget] = useState<number>(ORIGINAL_WEDDING.total_budget);
  const [seed, setSeed] = useState<Seed>("original");
  const [local, setLocal] = useState<LocalSnapshot | null>(null);
  const [code, setCode] = useState(invited);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 초대 코드 기억하기: 링크로 받은 코드는 저장하고, 링크 없이 들어오면 저장해 둔 코드를 채운다.
  useEffect(() => {
    if (invited) {
      rememberInvite(invited);
      return;
    }
    const saved = recallInvite();
    if (saved) {
      setCode(saved);
      setTab("join");
    }
  }, [invited]);

  // 이 브라우저에서 쓰던 기록이 있으면 그것을 기본값으로 삼는다(그동안 고친 내용을 잃지 않게).
  useEffect(() => {
    const snap = readLocalWorkspace();
    if (!snap) return;
    setLocal(snap);
    setSeed("local");
    setName(snap.data.wedding.name);
    setDate(snap.data.wedding.wedding_date);
    setGroom(snap.data.wedding.groom_name);
    setBride(snap.data.wedding.bride_name);
    setBudget(snap.data.wedding.total_budget);
  }, []);

  const create = async () => {
    if (!date) return setErr("결혼식 날짜를 선택해 주세요.");
    setLoading(true);
    setErr(null);
    const sb = getSupabaseBrowser();
    try {
      const { data: auth } = await sb.auth.getUser();
      const userId = auth.user?.id ?? null;
      const { data: wid, error } = await sb.rpc("create_wedding", {
        p_name: name,
        p_wedding_date: date,
        p_groom_name: groom,
        p_bride_name: bride,
        p_total_budget: budget,
      });
      if (error) throw error;
      const weddingId = wid as string;

      if (seed !== "empty") {
        const adapter = new SupabaseAdapter(sb);
        const source = seed === "local" && local ? local.data : buildMigratedData(weddingId, userId);
        // 위에서 입력한 이름 · 날짜 · 예산이 우선이고, 부수 정보(details)만 함께 옮긴다.
        await uploadWorkspace(adapter, weddingId, userId, source, {
          wedding: false,
          onProgress: (p) => setProgress({ done: p.done, total: p.total }),
        });
        await adapter.updateWedding(weddingId, { details: source.wedding.details ?? {} });
      }
      router.replace("/");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "문제가 발생했어요.");
      setProgress(null);
      setLoading(false);
    }
  };

  const join = async () => {
    if (!code.trim()) return setErr("초대 코드를 입력해 주세요.");
    setLoading(true);
    setErr(null);
    const sb = getSupabaseBrowser();
    const { error } = await sb.rpc("join_wedding_by_code", { p_code: code.trim() });
    if (error) {
      const m = error.message.toLowerCase();
      setErr(
        m.includes("invalid")
          ? "초대 코드를 찾을 수 없어요. 상대의 설정 › 계정 화면에 있는 8자리 코드를 확인해 주세요."
          : m.includes("two members")
            ? "이 공간에는 이미 두 사람이 참여해 있어요."
            : error.message,
      );
      setLoading(false);
      return;
    }
    try {
      localStorage.removeItem(INVITE_KEY);
    } catch {
      /* 무시 */
    }
    router.replace("/");
    router.refresh();
  };

  const options: { value: Seed; icon: React.ReactNode; label: string; desc: string }[] = [
    ...(local
      ? [
          {
            value: "local" as const,
            icon: <FileUp className="size-4" />,
            label: `이 기기에서 쓰던 기록 그대로 (${local.rows}건)`,
            desc: local.updatedAt
              ? `마지막 수정 ${formatKoreanDate(local.updatedAt.slice(0, 10))} · 그동안 고친 내용까지 함께 올라가요`
              : "그동안 고친 내용까지 함께 올라가요",
          },
        ]
      : []),
    {
      value: "original",
      icon: <Database className="size-4" />,
      label: `원본 결혼계획표 불러오기 (${MIGRATION_TOTAL}건)`,
      desc: "스프레드시트에서 옮긴 할 일 · 예산 · 하객 · 업체 그대로",
    },
    { value: "empty", icon: <Sparkles className="size-4" />, label: "빈 상태로 시작", desc: "처음부터 직접 채울게요" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.375rem] font-bold text-fg">결혼 준비 공간 만들기</h1>
        <p className="mt-1 text-[0.9375rem] text-fg-3">두 사람이 같은 공간에서 함께 기록해요.</p>
      </div>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "create", label: "새로 만들기" },
          { value: "join", label: "초대 코드로 참여" },
        ]}
      />
      {tab === "create" ? (
        <div className="space-y-4">
          <FieldRow label="공간 이름">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </FieldRow>
          <FieldRow label="결혼식 날짜" required>
            <DateField value={date} onChange={setDate} quick={false} clearable={false} />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="신랑 이름">
              <input className={inputCls} value={groom} onChange={(e) => setGroom(e.target.value)} placeholder="신랑" />
            </FieldRow>
            <FieldRow label="신부 이름">
              <input className={inputCls} value={bride} onChange={(e) => setBride(e.target.value)} placeholder="신부" />
            </FieldRow>
          </div>
          <FieldRow label="총 예산 (나중에 바꿀 수 있어요)">
            <MoneyField value={budget} onChange={setBudget} />
          </FieldRow>

          <div className="space-y-2" role="radiogroup" aria-label="시작 데이터">
            <p className="text-[0.875rem] font-medium text-fg-2">무엇부터 채울까요?</p>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={seed === o.value}
                onClick={() => setSeed(o.value)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[14px] border px-4 py-3 text-left transition-colors",
                  seed === o.value ? "border-accent bg-accent-softer" : "border-line bg-surface hover:bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                    seed === o.value ? "bg-accent text-accent-fg" : "bg-surface-2 text-fg-3",
                  )}
                >
                  {seed === o.value ? <Check className="size-4" /> : o.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[1rem] font-medium text-fg">{o.label}</span>
                  <span className="mt-0.5 block text-[0.875rem] leading-snug text-fg-3">{o.desc}</span>
                </span>
              </button>
            ))}
          </div>

          {err && <p className="rounded-[10px] bg-danger-soft px-3 py-2 text-[0.875rem] text-danger">{err}</p>}
          <Button full size="lg" loading={loading} onClick={create}>
            시작하기
          </Button>
          {progress && progress.total > 0 && (
            <p className="text-center text-[0.875rem] text-fg-3 tabular">
              기록을 옮기는 중 {progress.done} / {progress.total}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <FieldRow label="초대 코드" hint={code ? "초대 링크에서 받은 코드예요. 참여하기만 누르면 됩니다." : "파트너의 설정 › 계정 화면에서 확인할 수 있어요."}>
            <input className={`${inputCls} uppercase tracking-widest`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD1234" maxLength={8} />
          </FieldRow>
          {err && <p className="rounded-[10px] bg-danger-soft px-3 py-2 text-[0.875rem] text-danger">{err}</p>}
          <Button full size="lg" loading={loading} onClick={join}>
            참여하기
          </Button>
        </div>
      )}
    </div>
  );
}
