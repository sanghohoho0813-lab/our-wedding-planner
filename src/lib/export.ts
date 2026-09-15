import { DEFAULTS, type DataTable } from "@/lib/db/defaults";
import { TABLE_NAMES, type TableMap, type TableName, type WeddingData } from "@/lib/db/types";
import { nowISO, uid } from "@/lib/utils";

export const EXPORT_VERSION = 1;

export function download(filename: string, content: string | Blob, mime = "text/plain;charset=utf-8") {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toJSONBackup(data: WeddingData): string {
  return JSON.stringify({ app: "our-wedding-planner", version: EXPORT_VERSION, exported_at: nowISO(), data }, null, 2);
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 한국어 헤더 매핑 (내보내기/가져오기 공용) */
export const CSV_HEADERS: Partial<Record<TableName, [string, string][]>> = {
  tasks: [["title", "제목"], ["category", "카테고리"], ["due_date", "마감일"], ["status", "상태"], ["priority", "중요도"], ["assignee", "담당"], ["memo", "메모"]],
  budget_items: [["name", "항목명"], ["category_name", "카테고리"], ["estimated_amount", "예상 견적"], ["actual_amount", "실제 금액"], ["vendor_name", "업체"], ["memo", "메모"]],
  payments: [["item_name", "예산 항목"], ["title", "결제명"], ["amount", "금액"], ["due_date", "예정일"], ["paid", "결제 완료"], ["paid_at", "결제일"], ["memo", "메모"]],
  guests: [["name", "이름"], ["side", "측"], ["relation", "관계"], ["rsvp", "참석"], ["companions", "동반 인원"], ["meal", "식사"], ["contacted", "연락 여부"], ["invitation_sent", "청첩장 전달"], ["invitation_method", "청첩장 방식"], ["memo", "메모"]],
  gifts: [["recipient", "대상"], ["relation", "관계"], ["item", "선물"], ["estimated_cost", "예상 비용"], ["actual_cost", "실제 비용"], ["is_purchased", "구매 여부"], ["is_delivered", "전달 여부"], ["delivered_at", "전달일"], ["memo", "메모"]],
  events: [["title", "제목"], ["type", "종류"], ["date", "날짜"], ["start_time", "시작"], ["end_time", "종료"], ["location", "장소"], ["memo", "메모"]],
  invitation_meetings: [["title", "모임명"], ["target", "대상"], ["date", "날짜"], ["time", "시간"], ["place", "장소"], ["attendee_count", "인원"], ["estimated_cost", "예상 비용"], ["actual_cost", "실제 비용"], ["status", "상태"], ["memo", "메모"]],
  vendors: [["category", "분류"], ["name", "업체명"], ["status", "상태"], ["contact_name", "담당자"], ["phone", "연락처"], ["reserved_date", "예약일"], ["visit_date", "방문일"], ["total_amount", "총금액"], ["deposit", "계약금"], ["balance", "잔금"], ["payment_status", "결제 상태"], ["url", "URL"], ["memo", "메모"]],
  venues: [["name", "식장"], ["address", "위치"], ["event_date", "날짜"], ["event_time", "시간"], ["is_contracted", "계약"], ["hall_fee", "대관료"], ["meal_cost", "식대"], ["guaranteed_guests", "보증 인원"], ["expected_guests", "예상 하객"], ["deposit", "계약금"], ["balance", "잔금"], ["parking", "주차"], ["transport", "교통"], ["contact_name", "담당자"], ["phone", "연락처"], ["url", "URL"], ["notes", "특이사항"], ["memo", "메모"]],
  music_items: [["slot", "구간"], ["title", "곡명"], ["artist", "가수"], ["url", "URL"], ["section", "사용 구간"], ["is_confirmed", "확정"], ["memo", "메모"]],
  outfit_items: [["kind", "종류"], ["vendor_name", "업체"], ["reserve_date", "예약일"], ["fitting_date", "피팅일"], ["pickup_date", "수령일"], ["cost", "비용"], ["is_paid", "결제 여부"], ["memo", "메모"]],
  honeymoon_items: [["kind", "구분"], ["title", "내용"], ["date", "날짜"], ["time", "시간"], ["done", "완료"], ["memo", "메모"]],
  memos: [["content", "내용"], ["created_at", "작성일"]],
};

export const CSV_TABLE_LABEL: Partial<Record<TableName, string>> = {
  tasks: "할 일",
  budget_items: "상세 예산",
  payments: "결제",
  guests: "하객 목록",
  gifts: "선물",
  events: "일정",
  invitation_meetings: "청첩장 모임",
  vendors: "업체",
  venues: "식장",
  music_items: "음악",
  outfit_items: "예복",
  honeymoon_items: "신혼여행",
  memos: "메모",
};

export function toCSV(table: TableName, data: WeddingData): string {
  const headers = CSV_HEADERS[table];
  if (!headers) return "";
  const rows = data[table] as unknown as Record<string, unknown>[];
  const catName = new Map(data.budget_categories.map((c) => [c.id, c.name]));
  const itemName = new Map(data.budget_items.map((i) => [i.id, i.name]));
  const lines = [headers.map(([, ko]) => csvCell(ko)).join(",")];
  for (const r of rows) {
    lines.push(
      headers
        .map(([key]) => {
          if (key === "category_name") return csvCell(r.category_id ? catName.get(r.category_id as string) ?? "" : "");
          if (key === "item_name") return csvCell(itemName.get(r.budget_item_id as string) ?? "");
          return csvCell(r[key]);
        })
        .join(","),
    );
  }
  return "﻿" + lines.join("\r\n");
}

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQ = false;
      } else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const BOOL_TRUE = new Set(["true", "1", "y", "yes", "o", "예", "완료", "네", "true"]);
const KO_ENUM: Record<string, Record<string, string>> = {
  status: { "시작 전": "todo", "진행 중": "doing", 대기: "waiting", 완료: "done", 예정: "planned", 취소: "canceled", 후보: "candidate", 계약: "contracted" },
  priority: { 중요: "high", 높음: "high", 보통: "normal", 낮음: "low" },
  assignee: { 함께: "both", 신랑: "groom", 신부: "bride" },
  side: { 신랑측: "groom", 신랑: "groom", 신부측: "bride", 신부: "bride" },
  rsvp: { 참석: "yes", 미정: "maybe", 불참: "no" },
  meal: { 식사: "yes", "식사 안 함": "no", 미정: "unknown" },
  invitation_method: { 모바일: "mobile", 종이: "paper", "둘 다": "both" },
  payment_status: { 미결제: "unpaid", 계약금: "deposit", 완납: "paid" },
  slot: { "식전 음악": "pre", "신랑 입장": "groom_entry", "신부 입장": "bride_entry", "부모님 입장": "parents_entry", 축가: "song", 행진: "march", 기타: "other" },
  type: { 피팅: "fitting", 방문: "visit", 촬영: "shoot", 모임: "meeting", 결제: "payment", 약속: "appointment", 여행: "travel", 기타: "other" },
  kind: { 체크리스트: "checklist", 일정: "itinerary" },
  category: { "헤어 & 메이크업": "beauty", 부케: "bouquet", "사진 / 영상": "photo", 코디네이션: "coordination", 기타: "other" },
};

/** CSV → 행 값 목록 (id/wedding_id 제외). 한국어 또는 영문 헤더 모두 허용 */
export function csvToRows<T extends DataTable>(table: T, text: string, data: WeddingData): Partial<TableMap[T]>[] {
  const headers = CSV_HEADERS[table];
  if (!headers) throw new Error("이 항목은 CSV 가져오기를 지원하지 않아요.");
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim());
  const keyOf = (h: string) => headers.find(([k, ko]) => k === h || ko === h)?.[0];
  const cols = head.map(keyOf);
  const defaults = DEFAULTS[table] as Record<string, unknown>;
  const catId = new Map(data.budget_categories.map((c) => [c.name, c.id]));
  const itemId = new Map(data.budget_items.map((i) => [i.name, i.id]));
  const out: Partial<TableMap[T]>[] = [];
  for (const r of rows.slice(1)) {
    const obj: Record<string, unknown> = {};
    cols.forEach((key, i) => {
      if (!key) return;
      const raw = (r[i] ?? "").trim();
      if (key === "category_name") {
        obj.category_id = catId.get(raw) ?? null;
        return;
      }
      if (key === "item_name") {
        obj.budget_item_id = itemId.get(raw) ?? null;
        return;
      }
      const def = defaults[key];
      if (typeof def === "number") obj[key] = Number(raw.replace(/[^\d.-]/g, "")) || 0;
      else if (typeof def === "boolean") obj[key] = BOOL_TRUE.has(raw.toLowerCase());
      else if (raw === "") obj[key] = def === "" ? "" : null;
      else obj[key] = KO_ENUM[key]?.[raw] ?? raw;
    });
    if (table === "payments" && !obj.budget_item_id) continue;
    out.push(obj as Partial<TableMap[T]>);
  }
  return out;
}

export function csvTemplate(table: TableName): string {
  const headers = CSV_HEADERS[table];
  if (!headers) return "";
  return "﻿" + headers.map(([, ko]) => csvCell(ko)).join(",") + "\r\n";
}

/** JSON 백업 파싱 → 새 wedding_id/id로 재매핑된 WeddingData */
export function parseJSONBackup(text: string, targetWeddingId: string, current: WeddingData): WeddingData {
  const parsed = JSON.parse(text) as { app?: string; data?: WeddingData };
  const src = parsed.data ?? (parsed as unknown as WeddingData);
  if (!src || !src.wedding || typeof src.wedding !== "object") throw new Error("올바른 백업 파일이 아니에요.");
  const idMap = new Map<string, string>();
  const remap = (id: unknown) => (typeof id === "string" && id ? (idMap.get(id) ?? (idMap.set(id, uid()), idMap.get(id)!)) : id);
  const next = { wedding: { ...current.wedding, ...src.wedding, id: targetWeddingId, invite_code: current.wedding.invite_code, created_by: current.wedding.created_by } } as WeddingData;
  for (const t of TABLE_NAMES) {
    const rows = (Array.isArray(src[t]) ? src[t] : []) as unknown as Record<string, unknown>[];
    (next as unknown as Record<string, unknown[]>)[t] = rows.map((r) => {
      const o: Record<string, unknown> = { ...r, id: remap(r.id), wedding_id: targetWeddingId };
      for (const k of ["category_id", "budget_item_id", "vendor_id", "event_id", "entity_id", "source_id"]) if (k in o) o[k] = remap(o[k]);
      return o;
    });
  }
  return next;
}
