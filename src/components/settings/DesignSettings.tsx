"use client";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { ACCENTS, FONT_SCALES, useSettingsStore } from "@/lib/store/settings-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/Card";
import { DateField, FieldRow, TextField, TimeField } from "@/components/ui/Field";
import { MoneyField } from "@/components/ui/MoneyField";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Segmented } from "@/components/ui/Segmented";
import { PageHeader } from "@/components/layout/PageHeader";
import { SettingsNav } from "./SettingsNav";

export function DesignSettings() {
  const { theme, accent, fontScale, setTheme, setAccent, setFontScale } = useSettingsStore();
  const wedding = useWeddingStore((s) => s.data!.wedding);
  const updateWedding = useWeddingStore((s) => s.updateWedding);

  return (
    <div>
      <PageHeader title="디자인 설정" description="바꾸는 즉시 전체 화면에 적용돼요" />
      <SettingsNav />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader title="테마 모드" />
            <div className="px-5 pb-5">
              <Segmented
                size="lg"
                options={[
                  { value: "light", label: "라이트", icon: <Sun className="size-4" /> },
                  { value: "dark", label: "다크", icon: <Moon className="size-4" /> },
                  { value: "system", label: "시스템", icon: <Monitor className="size-4" /> },
                ]}
                value={theme}
                onChange={setTheme}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="포인트 컬러" />
            <div className="flex flex-wrap gap-3 px-5 pb-5" role="radiogroup" aria-label="포인트 컬러">
              {ACCENTS.map((a) => {
                const active = accent === a.key;
                return (
                  <button
                    key={a.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={a.label}
                    onClick={() => setAccent(a.key)}
                    className={cn("flex flex-col items-center gap-1.5 rounded-[14px] p-2 transition-colors hover:bg-surface-2", active && "bg-surface-2")}
                  >
                    <span className={cn("inline-flex size-11 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-shadow", active && "ring-2 ring-fg/70")} style={{ background: a.color }}>
                      {active && <Check className="size-5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="text-[0.8125rem] text-fg-2">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </Card>
          <Card>
            <CardHeader title="글자 크기" />
            <div className="px-5 pb-5">
              <Segmented size="lg" options={FONT_SCALES.map((f) => ({ value: String(f.value), label: f.label }))} value={String(fontScale)} onChange={(v) => setFontScale(Number(v) as typeof fontScale)} />
              <p className="mt-2 text-[0.8125rem] text-fg-3">현재 {Math.round(fontScale * 100)}%</p>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="미리보기" />
            <div className="px-5 pb-5">
              <div className="rounded-[16px] border border-line bg-bg p-4">
                <p className="font-script text-[2.25rem] leading-none text-accent-text">D-97</p>
                <p className="mt-2 text-[1rem] font-semibold text-fg">이렇게 보일 거예요.</p>
                <p className="text-[0.875rem] text-fg-2">우리의 특별한 날까지, 행복하게 준비해요. ♡</p>
                <ProgressBar value={68} className="mt-3" />
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-accent px-3 py-1 text-[0.8125rem] font-medium text-accent-fg">완료</span>
                  <span className="rounded-full bg-accent-soft px-3 py-1 text-[0.8125rem] font-medium text-accent-text">진행 중</span>
                  <span className="rounded-full bg-surface-2 px-3 py-1 text-[0.8125rem] font-medium text-fg-2">시작 전</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="결혼 정보" subtitle="D-Day와 홈 화면에 사용돼요" />
            <div className="space-y-4 px-5 pb-5">
              <FieldRow label="결혼식 날짜">
                <DateField value={wedding.wedding_date} onChange={(v) => v && updateWedding({ wedding_date: v })} quick={false} clearable={false} />
              </FieldRow>
              <FieldRow label="예식 시간">
                <TimeField value={wedding.wedding_time} onChange={(v) => updateWedding({ wedding_time: v })} />
              </FieldRow>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="신랑 이름">
                  <TextField value={wedding.groom_name} onChange={(v) => updateWedding({ groom_name: v })} placeholder="신랑" />
                </FieldRow>
                <FieldRow label="신부 이름">
                  <TextField value={wedding.bride_name} onChange={(v) => updateWedding({ bride_name: v })} placeholder="신부" />
                </FieldRow>
              </div>
              <FieldRow label="공간 이름">
                <TextField value={wedding.name} onChange={(v) => updateWedding({ name: v || "우리의 결혼 준비" })} />
              </FieldRow>
              <FieldRow label="총 예산">
                <MoneyField value={wedding.total_budget} onChange={(v) => updateWedding({ total_budget: v })} title="총 예산" />
              </FieldRow>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
