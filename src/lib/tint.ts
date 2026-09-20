/**
 * 영역(도메인)별 색.
 *
 * 홈 카드와 메뉴에서 "이건 예산, 이건 하객" 이 색으로 먼저 잡히게 한다.
 * 색은 고정 배정이고 절대 돌려쓰지 않는다(순서가 곧 구분의 근거라서).
 * 값과 대비는 globals.css 에 있고 dataviz 검증기로 확인했다.
 */
export type Tint = "plan" | "schedule" | "budget" | "guests" | "prep" | "travel" | "neutral";

interface TintClasses {
  /** 아이콘 (그림이라 3:1 이면 된다) */
  fg: string;
  /** soft 배경 위의 '작은 글자' (4.5:1 을 맞춘 별도 색) */
  text: string;
  /** 아이콘 칩 배경 */
  soft: string;
  /** 카드 위쪽 띠 */
  bar: string;
}

const MAP: Record<Tint, TintClasses> = {
  plan: { fg: "text-tint-plan", text: "text-tint-plan-text", soft: "bg-tint-plan-soft", bar: "bg-tint-plan" },
  schedule: { fg: "text-tint-schedule", text: "text-tint-schedule-text", soft: "bg-tint-schedule-soft", bar: "bg-tint-schedule" },
  budget: { fg: "text-tint-budget", text: "text-tint-budget-text", soft: "bg-tint-budget-soft", bar: "bg-tint-budget" },
  guests: { fg: "text-tint-guests", text: "text-tint-guests-text", soft: "bg-tint-guests-soft", bar: "bg-tint-guests" },
  prep: { fg: "text-tint-prep", text: "text-tint-prep-text", soft: "bg-tint-prep-soft", bar: "bg-tint-prep" },
  travel: { fg: "text-tint-travel", text: "text-tint-travel-text", soft: "bg-tint-travel-soft", bar: "bg-tint-travel" },
  neutral: { fg: "text-fg-3", text: "text-fg-2", soft: "bg-surface-2", bar: "bg-line-strong" },
};

export function tint(t: Tint | undefined): TintClasses {
  return MAP[t ?? "neutral"];
}

/** 화면 경로 → 영역 색 (사이드바 · 하단 탭이 같은 색을 쓰도록) */
export const TINT_BY_PATH: Record<string, Tint> = {
  "/": "plan",
  "/plan": "plan",
  "/budget": "budget",
  "/wedding": "prep",
  "/guests": "guests",
  "/honeymoon": "travel",
};

/** CSS 변수 이름 (차트처럼 색을 직접 넘겨야 할 때) */
export const TINT_VAR: Record<Exclude<Tint, "neutral">, string> = {
  plan: "var(--tint-plan)",
  schedule: "var(--tint-schedule)",
  budget: "var(--tint-budget)",
  guests: "var(--tint-guests)",
  prep: "var(--tint-prep)",
  travel: "var(--tint-travel)",
};

/**
 * 도넛처럼 조각의 '정체'를 색으로 구분해야 할 때 쓰는 고정 팔레트.
 * 순서 고정이고 절대 돌려쓰지 않는다.
 *
 * 개수를 3개로 묶어둔 이유:
 * 카드 띠나 아이콘처럼 '항상 글자가 옆에 붙어 있고 자리가 정해진' 색은 6종이어도
 * 옆칸끼리만 비교하면 되니까 충분히 구분된다(검증 통과).
 * 그런데 도넛은 범례의 어느 색과 조각의 어느 색이든 짝을 맞춰 봐야 해서
 * 모든 쌍이 서로 구분돼야 한다. 그 기준으로 재보면 6종 중 주황↔초록이
 * 적록색약에서 사실상 같은 색이 된다(ΔE 1.9). 3종까지가 안전선이라
 * 큰 3개만 색을 주고 나머지는 '그 외' 하나로 접는다.
 * 자세한 분해는 옆의 '카테고리별 예산 비율'(막대 + 이름)이 대신한다.
 */
export const CATEGORY_COLORS = ["var(--tint-plan)", "var(--tint-schedule)", "var(--tint-budget)"] as const;

export const CATEGORY_MAX = CATEGORY_COLORS.length;

/** i 번째 조각의 색. 범위를 넘으면 회색(= '그 외'). */
export function categoryColor(i: number): string {
  return i < CATEGORY_MAX ? CATEGORY_COLORS[i] : "var(--text-3)";
}
