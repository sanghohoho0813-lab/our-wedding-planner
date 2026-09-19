"use client";
import { CalendarDays, CheckSquare, Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { todayISO } from "@/lib/date";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Button } from "@/components/ui/Button";
import { DateField, FieldRow, TextField, TimeField, inputCls } from "@/components/ui/Field";
import { Sheet } from "@/components/ui/Sheet";

/**
 * 할 일과 일정을 한 곳에서 추가한다.
 *
 * 둘은 사용자에게 사실상 같은 것이다("12월 3일 예복 피팅"이 할 일인지 일정인지 고민할 이유가 없다).
 * 그래서 묻지 않고, 시간이나 장소를 적었으면 일정으로 · 아니면 할 일로 넣는다.
 * 어느 쪽이든 일정 화면에는 같이 보이므로 잘못 골라서 잃어버릴 일이 없다.
 */
export function AddSheet({
  open,
  onClose,
  initialDate,
}: {
  open: boolean;
  onClose: () => void;
  initialDate?: string | null;
}) {
  const add = useWeddingStore((s) => s.add);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string | null>(initialDate ?? null);
  const [time, setTime] = useState<string | null>(null);
  const [place, setPlace] = useState("");

  const asEvent = !!time || !!place.trim();

  const reset = () => {
    setTitle("");
    setDate(null);
    setTime(null);
    setPlace("");
  };

  const submit = () => {
    const t = title.trim();
    if (!t) return;
    if (asEvent) {
      add("events", { title: t, date: date ?? todayISO(), start_time: time, location: place.trim() || null, type: "other" });
    } else {
      add("tasks", { title: t, due_date: date });
    }
    reset();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="할 일 · 일정 추가"
      description="시간이나 장소를 적으면 일정으로, 없으면 할 일로 저장돼요"
      footer={
        <Button full size="lg" onClick={submit} disabled={!title.trim()}>
          {asEvent ? "일정으로 추가" : "할 일로 추가"}
        </Button>
      }
    >
      <div className="space-y-4">
        <FieldRow label="무엇을 하나요?" required>
          <input
            className={inputCls}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="예: 청첩장 주문, 예복 피팅"
            autoFocus
          />
        </FieldRow>
        <FieldRow label="날짜" hint={asEvent ? undefined : "비워두면 '날짜 미정' 할 일로 들어가요"}>
          <DateField value={date} onChange={setDate} />
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="시간">
            <TimeField value={time} onChange={setTime} />
          </FieldRow>
          <FieldRow label="장소">
            <TextField value={place} onChange={setPlace} delay={0} placeholder="선택" leftIcon={<MapPin />} />
          </FieldRow>
        </div>
        <p className="flex items-center gap-2 rounded-[12px] bg-surface-2 px-4 py-3 text-[0.875rem] text-fg-2">
          {asEvent ? <Clock className="size-4 shrink-0 text-accent" /> : <CheckSquare className="size-4 shrink-0 text-accent" />}
          {asEvent ? (
            <span>
              <b className="text-fg">일정</b>으로 저장돼요. 일정 화면에 시간과 함께 보여요.
            </span>
          ) : (
            <span>
              <b className="text-fg">할 일</b>로 저장돼요. 체크해서 지울 수 있고, 날짜를 넣으면 일정 화면에도 보여요.
            </span>
          )}
          <CalendarDays className="ml-auto hidden size-4 shrink-0 text-fg-3 sm:block" />
        </p>
      </div>
    </Sheet>
  );
}
