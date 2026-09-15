"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_WEDDING_DATE } from "@/lib/config";
import { DEFAULT_CATEGORIES, STARTER_TASKS } from "@/lib/db/seed";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { addDays } from "@/lib/date";
import { Button } from "@/components/ui/Button";
import { DateField, FieldRow, inputCls } from "@/components/ui/Field";
import { MoneyField } from "@/components/ui/MoneyField";
import { Segmented } from "@/components/ui/Segmented";
import { Toggle } from "@/components/ui/Toggle";

export function OnboardingForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("우리의 결혼 준비");
  const [date, setDate] = useState<string | null>(DEFAULT_WEDDING_DATE);
  const [groom, setGroom] = useState("");
  const [bride, setBride] = useState("");
  const [budget, setBudget] = useState(0);
  const [seed, setSeed] = useState(true);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const create = async () => {
    if (!date) return setErr("결혼식 날짜를 선택해 주세요.");
    setLoading(true);
    setErr(null);
    const sb = getSupabaseBrowser();
    try {
      const { data: wid, error } = await sb.rpc("create_wedding", {
        p_name: name,
        p_wedding_date: date,
        p_groom_name: groom,
        p_bride_name: bride,
        p_total_budget: budget,
      });
      if (error) throw error;
      if (seed) {
        await sb.from("budget_categories").insert(DEFAULT_CATEGORIES.map((c, i) => ({ wedding_id: wid, name: c.name, icon: c.icon, sort_order: i })));
        await sb.from("tasks").insert(
          STARTER_TASKS.map((t, i) => ({
            wedding_id: wid,
            title: t.title,
            category: t.category,
            due_date: addDays(date, t.offsetDays),
            priority: t.priority ?? "normal",
            sort_order: i,
          })),
        );
      }
      router.replace("/");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "문제가 발생했어요.");
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
      setErr(error.message.includes("invalid") ? "초대 코드를 찾을 수 없어요." : error.message);
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.25rem] font-bold text-fg">결혼 준비 공간 만들기</h1>
        <p className="mt-1 text-[0.875rem] text-fg-3">두 사람이 같은 공간에서 함께 기록해요.</p>
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
          <Toggle checked={seed} onChange={setSeed} label="기본 카테고리 · 체크리스트 넣기" description="웨딩홀, 스드메 등 기본 예산 카테고리와 준비 체크리스트" />
          {err && <p className="rounded-[10px] bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger">{err}</p>}
          <Button full size="lg" loading={loading} onClick={create}>
            시작하기
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <FieldRow label="초대 코드" hint="파트너의 설정 › 계정 화면에서 확인할 수 있어요.">
            <input className={`${inputCls} uppercase tracking-widest`} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABCD1234" maxLength={8} />
          </FieldRow>
          {err && <p className="rounded-[10px] bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger">{err}</p>}
          <Button full size="lg" loading={loading} onClick={join}>
            참여하기
          </Button>
        </div>
      )}
    </div>
  );
}
