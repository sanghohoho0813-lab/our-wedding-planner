import type { Task } from "@/lib/db/types";
import { addDays, daysUntil } from "@/lib/date";

/**
 * 날짜 없는 할 일에 "언제 하면 되는지" 를 대신 정해 준다.
 *
 * 결혼 준비 할 일에는 대개 정해진 시기가 있다 (청첩장은 D-60 즈음, 답례품은 D-3주 …).
 * 그런데 원본 계획표에서 넘어온 할 일은 대부분 날짜가 비어 있어서,
 * 앱이 '다음에 뭘 해야 하는지' 를 보여줄 수가 없었다. 사람이 하나씩 날짜를 고민해야 했다.
 *
 * 여기서는 제목 · 분류를 보고 결혼식 기준 '보통 하는 시기' 를 찾아 날짜를 제안한다.
 * - 그 시기가 이미 지났으면 → 늦어진 일로 표시하고 가까운 날로 당긴다
 * - 하루에 너무 몰리지 않게 나눈다
 * 정답을 강요하지 않는다. 사람이 보고 고치거나 빼면 된다.
 */

/** 결혼식 며칠 전에 보통 하는가 (음수면 결혼식 뒤) */
interface Rule {
  re: RegExp;
  before: number;
}

// 구체적인 것을 위에 둔다 (처음 맞는 규칙을 쓴다)
const TITLE_RULES: Rule[] = [
  { re: /혼인\s*신고/, before: -14 },
  { re: /감사\s*(인사|문자|연락)|답례\s*인사/, before: -7 },
  { re: /플래너/, before: 150 },
  { re: /상견례/, before: 120 },
  { re: /시식/, before: 60 },
  { re: /식장|웨딩홀|홀\s*투어|예식장/, before: 120 },
  { re: /모바일\s*청첩장|청첩장.*모바일/, before: 45 },
  { re: /청첩장\s*모임|모임/, before: 40 },
  { re: /청첩장/, before: 60 },
  { re: /스드메|스튜디오|웨딩\s*사진|웨딩\s*촬영|촬영|스냅/, before: 90 },
  { re: /가봉|피팅/, before: 30 },
  { re: /드레스|예복|턱시도|정장|한복|부모님\s*옷/, before: 45 },
  { re: /반지|예물|예단/, before: 60 },
  { re: /신혼\s*여행|여행\s*일정|항공|숙소|비자|여권/, before: 60 },
  { re: /신혼집|혼수|가전|가구|이사/, before: 45 },
  { re: /하객|명단/, before: 45 },
  { re: /부케|부토니에르/, before: 21 },
  { re: /답례품|선물/, before: 21 },
  { re: /식순|사회자|축가|주례|축사|음악|BGM|입장곡/i, before: 21 },
  { re: /헤어|메이크업/, before: 14 },
  { re: /보증\s*인원|최종\s*인원|식대/, before: 14 },
  { re: /리허설/, before: 7 },
  { re: /잔금|정산/, before: 7 },
];

const CATEGORY_BEFORE: Record<string, number> = {
  식장: 120,
  상견례: 120,
  스드메: 90,
  "사진/영상": 90,
  "사진·영상": 90,
  신혼여행: 60,
  청첩장: 60,
  예물: 60,
  예복: 45,
  하객: 45,
  혼수: 45,
  부케: 21,
  선물: 21,
  "헤어&메이크업": 14,
  예산: 14,
};

const DEFAULT_BEFORE = 30;
/** 하루에 이만큼까지만 몰아준다 */
const PER_DAY = 2;

export interface DateSuggestion {
  task: Task;
  /** 제안하는 날짜 */
  date: string;
  /** 보통은 결혼식 며칠 전에 하는 일인가 */
  before: number;
  /** 보통 하는 시기가 이미 지났다 */
  late: boolean;
  /** 이미 마감일이 있었는데 지난 일 */
  overdue: boolean;
}

export function typicalBefore(task: Pick<Task, "title" | "category">): number {
  const title = task.title ?? "";
  for (const r of TITLE_RULES) if (r.re.test(title)) return r.before;
  if (task.category && task.category in CATEGORY_BEFORE) return CATEGORY_BEFORE[task.category];
  return DEFAULT_BEFORE;
}

/** "보통 D-60 즈음" 같은 설명 */
export function typicalLabel(before: number): string {
  if (before < 0) return `보통 결혼식 ${-before}일 뒤`;
  if (before >= 30 && before % 30 === 0) return `보통 결혼식 ${before / 30}달 전`;
  if (before % 7 === 0 && before <= 28) return `보통 결혼식 ${before / 7}주 전`;
  return `보통 결혼식 D-${before}`;
}

/**
 * 정리가 필요한 할 일(날짜 없음 · 마감 지남)에 날짜를 제안한다.
 * 끝난 일은 건드리지 않는다.
 */
export function suggestTaskDates(tasks: Task[], weddingDate: string, today: string): DateSuggestion[] {
  const targets = tasks.filter((t) => t.status !== "done" && (!t.due_date || t.due_date < today));
  if (targets.length === 0) return [];

  const daysLeft = daysUntil(weddingDate, today);
  const load = new Map<string, number>();
  // 이미 날짜가 잡힌 일도 하루 몫으로 센다 (그날이 이미 바쁘면 피한다)
  for (const t of tasks) if (t.status !== "done" && t.due_date && t.due_date >= today) load.set(t.due_date, (load.get(t.due_date) ?? 0) + 1);

  const take = (from: string, limit: string | null): string => {
    let d = from;
    for (let i = 0; i < 60; i++) {
      if ((load.get(d) ?? 0) < PER_DAY && (!limit || d <= limit)) break;
      const next = addDays(d, 1);
      if (limit && next > limit) break;
      d = next;
    }
    load.set(d, (load.get(d) ?? 0) + 1);
    return d;
  };

  const planned = targets.map((task) => {
    const before = typicalBefore(task);
    const ideal = addDays(weddingDate, -before);
    return { task, before, ideal, late: ideal <= today };
  });
  // 늦은 것 · 이른 것부터 자리를 잡는다
  planned.sort((a, b) => a.ideal.localeCompare(b.ideal) || a.task.title.localeCompare(b.task.title, "ko"));

  // 결혼식 전 일은 결혼식 전날을 넘기지 않는다
  const dayBefore = daysLeft > 1 ? addDays(weddingDate, -1) : null;
  const tomorrow = addDays(today, 1);

  return planned.map(({ task, before, ideal, late }) => {
    const from = late ? tomorrow : ideal;
    const limit = before > 0 ? dayBefore : null;
    return {
      task,
      date: take(from < tomorrow ? tomorrow : from, limit),
      before,
      late,
      overdue: !!task.due_date && task.due_date < today,
    };
  });
}
