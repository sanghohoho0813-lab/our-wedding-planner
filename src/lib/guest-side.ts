import type { Guest, GuestSide } from "@/lib/db/types";
import type { Tint } from "@/lib/tint";

/**
 * 하객이 누구 쪽 사람인가.
 *
 * 'both' 는 신랑 · 신부가 둘 다 아는 지인이다. 양쪽에 한 번씩 세면 총원이 부풀어서
 * 식대가 틀어지므로, 겹쳐 세지 않고 '공통' 이라는 제 칸으로 센다.
 */
export const GUEST_SIDES: { value: GuestSide; label: string; short: string; tint: Tint }[] = [
  { value: "groom", label: "신랑측", short: "신랑", tint: "schedule" },
  { value: "bride", label: "신부측", short: "신부", tint: "plan" },
  { value: "both", label: "공통", short: "공통", tint: "guests" },
];

export const SIDE_LABEL: Record<GuestSide, string> = {
  groom: "신랑측",
  bride: "신부측",
  both: "공통 지인",
};

export const SIDE_SHORT: Record<GuestSide, string> = { groom: "신랑", bride: "신부", both: "공통" };
export const SIDE_TINT: Record<GuestSide, Tint> = { groom: "schedule", bride: "plan", both: "guests" };

/**
 * 이 하객이 데려오는 총 인원.
 * '동반 1명' 은 본인 말고 한 명 더라는 뜻이라 2명이 된다.
 * 부부를 한 줄에 적을 때("김철수 & 이영희 부부") 동반 1명으로 두면 딱 맞는다.
 */
export function headcount(g: Pick<Guest, "companions">): number {
  return 1 + Math.max(0, g.companions ?? 0);
}

/** "2명" 처럼 보여줄 때. 혼자면 굳이 쓰지 않아도 되므로 null 을 준다. */
export function headcountLabel(g: Pick<Guest, "companions">): string | null {
  const n = headcount(g);
  return n > 1 ? `${n}명` : null;
}
