"use client";
import type { TableName } from "@/lib/db/types";
import {
  ASSIGNEE_LABEL,
  INVITATION_METHOD,
  MEAL,
  MEETING_STATUS_LABEL,
  RSVP_LABEL,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  VENDOR_STATUS_LABEL,
} from "@/lib/labels";
import { formatKRW } from "@/lib/money";

/**
 * 방금 내가 고친 것 기억해 두기.
 *
 * 둘이 같이 쓰다 보면 같은 항목을 비슷한 때에 고치는 일이 생긴다.
 * 나중에 저장된 쪽이 이기는 건 어쩔 수 없다(그게 가장 이해하기 쉬운 규칙이다).
 * 문제는 **내가 방금 쓴 값이 소리 없이 사라지는 것**이다.
 *
 * 그래서 내가 고친 칸과 값을 잠깐 기억해 두었다가, 상대의 수정이 그 칸을
 * 다른 값으로 덮으면 "상대가 바꿨어요" 라고 알려준다. 되돌릴지는 사용자가 정한다.
 *
 * 버전 관리나 병합은 하지 않는다. 두 사람이 쓰는 앱에 그건 과하다.
 */

const WINDOW_MS = 25_000;

interface Mine {
  value: unknown;
  /** 내가 덮기 *전* 의 값 — 뒤늦게 도착한 옛날 사진을 알아보는 데 쓴다 */
  prev: unknown;
  at: number;
}

const mine = new Map<string, Mine>();
const key = (table: TableName | "wedding", id: string, field: string) => `${table}:${id}:${field}`;

/** 내가 고친 칸들을 기록한다 */
export function rememberMine(
  table: TableName | "wedding",
  id: string,
  patch: Record<string, unknown>,
  before?: Record<string, unknown> | null,
): void {
  const at = Date.now();
  for (const [field, value] of Object.entries(patch)) {
    if (field === "updated_at") continue;
    mine.set(key(table, id, field), { value, prev: before ? before[field] : undefined, at });
  }
  if (mine.size > 400) {
    // 오래된 것부터 버린다
    const cutoff = at - WINDOW_MS;
    for (const [k, v] of mine) if (v.at < cutoff) mine.delete(k);
  }
}

export interface Clash {
  field: string;
  mineValue: unknown;
  theirValue: unknown;
}

/**
 * 상대가 보낸 행이 내가 방금 쓴 칸을 다른 값으로 덮는가.
 * 덮는 칸들을 돌려주고, 그 칸의 기억은 지운다(같은 안내를 두 번 띄우지 않게).
 */
export function findClashes(table: TableName | "wedding", id: string, theirRow: Record<string, unknown>): Clash[] {
  const now = Date.now();
  const out: Clash[] = [];
  for (const [field, theirValue] of Object.entries(theirRow)) {
    if (field === "updated_at" || field === "created_at" || field === "id") continue;
    const k = key(table, id, field);
    const m = mine.get(k);
    if (!m) continue;
    if (now - m.at > WINDOW_MS) {
      mine.delete(k);
      continue;
    }
    // 같은 값이면 내 수정이 메아리로 돌아온 것이다.
    // 이때 기억을 지우면 안 된다 — 진짜 덮어쓰기는 대개 이 메아리 *다음*에 온다.
    if (JSON.stringify(m.value) === JSON.stringify(theirValue)) continue;
    // 내가 덮기 전의 값 그대로라면, 내 수정이 서버에 닿기 전에 찍힌 옛날 사진이다.
    // 내 값이 곧 이기므로 충돌이 아니다 (시계가 어긋나도 이 판단은 흔들리지 않는다).
    if (m.prev !== undefined && JSON.stringify(m.prev) === JSON.stringify(theirValue)) continue;
    out.push({ field, mineValue: m.value, theirValue });
    mine.delete(k);
  }
  return out;
}

/** 내가 방금 이 행을 고쳤는가 (지워졌을 때 알려줄지 판단용) */
export function didITouch(table: TableName | "wedding", id: string): boolean {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [k, v] of mine) {
    if (k.startsWith(`${table}:${id}:`) && v.at >= cutoff) return true;
  }
  return false;
}

export function forget(table: TableName | "wedding", id: string): void {
  for (const k of [...mine.keys()]) if (k.startsWith(`${table}:${id}:`)) mine.delete(k);
}

/** 사람이 읽을 수 있는 칸 이름 */
export const FIELD_LABEL: Record<string, string> = {
  title: "제목",
  name: "이름",
  memo: "메모",
  status: "상태",
  rsvp: "참석 여부",
  due_date: "마감일",
  date: "날짜",
  amount: "금액",
  actual_amount: "실제 금액",
  estimated_amount: "예상 금액",
  companions: "동반 인원",
  side: "측",
  relation: "관계",
  priority: "중요도",
  assignee: "담당",
  paid: "결제 여부",
  content: "내용",
  location: "장소",
  start_time: "시간",
  total_budget: "총 예산",
};

export function fieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? field;
}

const MEAL_LABEL = Object.fromEntries(MEAL.map((o) => [o.value, o.label]));
const METHOD_LABEL = Object.fromEntries(INVITATION_METHOD.map((o) => [o.value, o.label]));
const SIDE_LABEL: Record<string, string> = { groom: "신랑 측", bride: "신부 측", both: "공통" };
const MONEY_FIELDS = new Set([
  "amount", "actual_amount", "estimated_amount", "total_budget", "hall_fee", "meal_cost", "deposit", "balance", "price",
]);

/**
 * 안내문에 들어갈 값. 'no' 가 아니라 '불참' 이라고 말해야 알아듣는다.
 * 화면에서 쓰는 이름표를 그대로 쓴다.
 */
export function valueLabel(table: TableName | "wedding", field: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "비움";
  if (typeof v === "boolean") return v ? "예" : "아니오";
  const s = String(v);
  if (MONEY_FIELDS.has(field) && typeof v === "number") return formatKRW(v);
  const named =
    field === "rsvp" ? RSVP_LABEL[s as keyof typeof RSVP_LABEL]
    : field === "meal" ? MEAL_LABEL[s]
    : field === "side" ? SIDE_LABEL[s]
    : field === "assignee" ? ASSIGNEE_LABEL[s as keyof typeof ASSIGNEE_LABEL]
    : field === "priority" ? TASK_PRIORITY_LABEL[s as keyof typeof TASK_PRIORITY_LABEL]
    : field === "invitation_method" ? METHOD_LABEL[s]
    : field === "status"
      ? table === "invitation_meetings" ? MEETING_STATUS_LABEL[s as keyof typeof MEETING_STATUS_LABEL]
        : table === "vendors" ? VENDOR_STATUS_LABEL[s as keyof typeof VENDOR_STATUS_LABEL]
        : TASK_STATUS_LABEL[s as keyof typeof TASK_STATUS_LABEL]
      : undefined;
  const out = named ?? s;
  return out.length > 20 ? out.slice(0, 19) + "…" : out;
}
