import { CalendarCheck, Camera, CheckSquare, CircleDot, CreditCard, Gem, MapPin, Plane, Shirt, Users } from "lucide-react";
import type { EventType } from "@/lib/db/types";
import { tint, type Tint } from "@/lib/tint";
import { cn } from "@/lib/utils";

export function EventTypeIcon({ type, className }: { type: EventType; className?: string }) {
  switch (type) {
    case "task":
      return <CheckSquare className={className} />;
    case "fitting":
      return <Shirt className={className} />;
    case "visit":
      return <MapPin className={className} />;
    case "shoot":
      return <Camera className={className} />;
    case "meeting":
      return <Users className={className} />;
    case "payment":
      return <CreditCard className={className} />;
    case "appointment":
      return <CalendarCheck className={className} />;
    case "travel":
      return <Plane className={className} />;
    case "wedding":
      return <Gem className={className} />;
    default:
      return <CircleDot className={className} />;
  }
}

/**
 * 일정 종류 → 영역 색.
 * 같은 색이 여러 종류에 붙는 건 일부러다. 읽는 사람이 외워야 하는 건
 * "무슨 아이콘이었지" 가 아니라 "이건 예산 쪽 / 준비 쪽" 이라는 큰 덩어리다.
 */
export const EVENT_TINT: Record<EventType, Tint> = {
  task: "plan",
  fitting: "prep",
  visit: "prep",
  shoot: "prep",
  meeting: "guests",
  payment: "budget",
  appointment: "schedule",
  travel: "travel",
  wedding: "plan",
  other: "schedule",
};

/** 아이콘 + 그 종류의 색 칩을 한 번에. 목록/달력에서 같은 모양으로 쓴다. */
export function EventTypeChip({ type, size = "md", done }: { type: EventType; size?: "sm" | "md"; done?: boolean }) {
  const c = tint(EVENT_TINT[type]);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[10px]",
        size === "sm" ? "size-7 [&>svg]:size-3.5" : "size-9 [&>svg]:size-4",
        done ? "bg-surface-2 text-fg-3" : cn(c.soft, c.fg),
      )}
    >
      <EventTypeIcon type={type} />
    </span>
  );
}
