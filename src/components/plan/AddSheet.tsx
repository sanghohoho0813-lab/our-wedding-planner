"use client";
import { CalendarDays, CheckSquare, Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { todayISO } from "@/lib/date";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Button } from "@/components/ui/Button";
import { DateField, FieldRow, TextField, TimeField, inputCls } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";

/**
 * 할 일과 일정을 한 곳에서 추가한다.
 *
 * 전에는 묻지 않고 **시간이나 장소를 적었는지로** 몰래 정했다.
 * 그런데 일정 화면에서 제목만 적고 추가하면 '할 일' 로 들어가고,
 * 날짜가 없으면 일정 목록에 아예 안 보인다 — 저장은 됐는데 사라진 것처럼 보인다.
 *
 * 그래서 위에 [할 일 | 일정] 을 두고, 어느 화면에서 열었는지에 맞춰 미리 골라 둔다.
 * 시간이나 장소를 적으면 여전히 '일정' 쪽으로 옮겨 주되, 사용자가 직접 고른 뒤에는 건드리지 않는다.
 */
export function AddSheet({
  open,
  onClose,
  initialDate,
  defaultKind = "task",
}: {
  open: boolean;
  onClose: () => void;
  initialDate?: string | null;
  /** 어느 화면에서 열었는가 — 일정 화면에서 열면 '일정' 으로 먼저 맞춰 둔다 */
  defaultKind?: "task" | "event";
}) {
  const add = useWeddingStore((s) => s.add);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<string | null>(initialDate ?? null);
  const [time, setTime] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  // 할 일인지 일정인지는 **사용자가 고른다.**
  // 전에는 시간·장소를 적었는지로 몰래 정해서, 일정 화면에서 제목만 적고 추가하면
  // 할 일로 들어갔다. 저장은 됐는데 일정 목록에 없으니 "사라졌다" 고 느낀다.
  const [kind, setKind] = useState<"task" | "event">(defaultKind);
  const [picked, setPicked] = useState(false);
  const asEvent = kind === "event";

  useEffect(() => {
    if (open) {
      setKind(defaultKind);
      setPicked(false);
    }
  }, [open, defaultKind]);

  // 시간이나 장소를 적으면 '일정' 쪽으로 옮겨 준다 (직접 고른 뒤에는 건드리지 않는다)
  useEffect(() => {
    if (!picked && (time || place.trim())) setKind("event");
  }, [time, place, picked]);

  const choose = (k: "task" | "event") => {
    setPicked(true);
    setKind(k);
  };

  const reset = () => {
    setTitle("");
    setDate(null);
    setTime(null);
    setPlace("");
    setKind(defaultKind);
    setPicked(false);
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
      title={asEvent ? "일정 추가" : "할 일 추가"}
      description={asEvent ? "날짜 · 시간이 있는 일은 일정으로" : "언제 할지 정하지 않은 일은 할 일로"}
      footer={
        <Button full size="lg" onClick={submit} disabled={!title.trim()}>
          {asEvent ? "일정으로 추가" : "할 일로 추가"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Segmented
          options={[
            { value: "task", label: "할 일" },
            { value: "event", label: "일정" },
          ]}
          value={kind}
          onChange={choose}
          className="max-w-xs"
        />
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
        <FieldRow label="날짜" required={asEvent} hint={asEvent ? "비워두면 오늘로 넣어요" : "비워두면 '날짜 미정' 할 일로 들어가요"}>
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
