import {
  addDays as dfAddDays,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from "date-fns";
import { TIMEZONE } from "./config";

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** 현재 시각을 Asia/Seoul 기준의 각 파트로 분해 */
export function seoulParts(date: Date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) parts[p.type] = p.value;
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Asia/Seoul 기준 오늘 날짜 (YYYY-MM-DD) */
export function todayISO(date: Date = new Date()): string {
  const p = seoulParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** 'YYYY-MM-DD' → 로컬 Date (시간 00:00). 캘린더 계산 전용 */
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** 잘못된 날짜가 들어오면 계산을 건너뛸 수 있도록 null 을 주는 안전 버전 */
export function fromISOSafe(iso: string | null | undefined): Date | null {
  return isValidISO(iso) ? fromISO(iso) : null;
}

export function toISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
/** 앱이 다루는 날짜의 합리적 범위. 이 밖의 값은 파싱 오류로 본다. */
export const MIN_YEAR = 1970;
export const MAX_YEAR = 2100;

export function isValidISO(iso: string | null | undefined): iso is string {
  if (!iso || !ISO_RE.test(iso)) return false;
  if (!isValid(parseISO(iso))) return false;
  const y = Number(iso.slice(0, 4));
  if (y < MIN_YEAR || y > MAX_YEAR) return false;
  // 2월 30일 같은 값이 굴러가지 않도록 왕복 검증
  return toISO(fromISO(iso)) === iso;
}

/**
 * Google Sheets / Excel 의 날짜 serial 값을 ISO 로 바꾼다.
 * 1900 시스템의 윤년 버그(1900-02-29)를 감안해 1899-12-30 을 기준일로 쓴다.
 * serial 로 보기 어려운 값이면 null 을 돌려준다(1900-01-01 같은 fallback 을 절대 만들지 않는다).
 */
export function fromSpreadsheetSerial(value: number): string | null {
  if (!Number.isFinite(value)) return null;
  // 1(1899-12-31) ~ 73050(2100-01-01) 범위만 날짜로 인정
  if (value < 1 || value > 73050) return null;
  const ms = Math.round(value) * 86400000;
  const base = Date.UTC(1899, 11, 30);
  const d = new Date(base + ms);
  const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return isValidISO(iso) ? iso : null;
}

/**
 * 어떤 형태로 들어오든 ISO(yyyy-MM-dd) 로 정규화한다. 실패하면 null.
 * 숫자/숫자문자열은 스프레드시트 serial 로 판별하고, 2026.12.21 / 2026/12/21 / 26.12.21 도 받는다.
 * 파싱에 실패했을 때 임의의 fallback 날짜를 만들지 않는 것이 이 함수의 핵심이다.
 */
export function normalizeDateInput(input: unknown): string | null {
  if (input == null || input === "") return null;
  if (input instanceof Date) return isValid(input) ? toISO(input) : null;
  if (typeof input === "number") return fromSpreadsheetSerial(input);
  const raw = String(input).trim();
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw);
    // 4자리 숫자(연도)는 날짜가 아니다
    if (raw.length <= 4) return null;
    return fromSpreadsheetSerial(n);
  }
  const m = raw.match(/^(\d{2,4})[.\-/\s]+(\d{1,2})[.\-/\s]+(\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    let year = Number(y);
    if (y.length === 2) year += 2000;
    const iso = `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return isValidISO(iso) ? iso : null;
  }
  return null;
}

/**
 * 결혼식 날짜를 안전하게 읽는다.
 * 잘못된 값이면 기본값으로 대체하되 valid:false 를 함께 돌려주어 화면이 사용자에게 알릴 수 있게 한다.
 */
export function safeWeddingDate(value: string | null | undefined, fallback: string): { date: string; valid: boolean; raw: string | null } {
  if (isValidISO(value)) return { date: value, valid: true, raw: value };
  return { date: isValidISO(fallback) ? fallback : todayISO(), valid: false, raw: value ?? null };
}

/** target까지 남은 일수 (양수 = 미래) */
export function daysUntil(targetISO: string, today: string = todayISO()): number {
  if (!isValidISO(targetISO)) return 0;
  return differenceInCalendarDays(fromISO(targetISO), fromISO(today));
}

export function formatDDay(days: number): string {
  if (days === 0) return "D-DAY";
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}

export function ddayLabel(targetISO: string, today?: string): string {
  return formatDDay(daysUntil(targetISO, today));
}

export function weekdayKo(iso: string): string {
  if (!isValidISO(iso)) return "";
  return WEEKDAYS_KO[getDay(fromISO(iso))];
}

/** 2026년 12월 21일 (월) */
export function formatKoreanDate(iso: string, opts: { weekday?: boolean; year?: boolean } = {}) {
  const { weekday = true, year = true } = opts;
  if (!isValidISO(iso)) return "날짜 없음";
  const d = fromISO(iso);
  const base = year ? format(d, "yyyy년 M월 d일") : format(d, "M월 d일");
  return weekday ? `${base} (${WEEKDAYS_KO[getDay(d)]})` : base;
}

/** 9.17 (수) */
export function formatShortDate(iso: string, withWeekday = true) {
  if (!isValidISO(iso)) return "—";
  const d = fromISO(iso);
  return withWeekday ? `${format(d, "M.d")} (${WEEKDAYS_KO[getDay(d)]})` : format(d, "M.d");
}

/** 2026.09.15 */
export function formatDotDate(iso: string) {
  return format(fromISO(iso), "yyyy.MM.dd");
}

/** 오전 09:41:32 */
export function formatClock(date: Date = new Date(), withSeconds = true) {
  const p = seoulParts(date);
  const ampm = p.hour < 12 ? "오전" : "오후";
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  const hh = String(h12).padStart(2, "0");
  const mm = String(p.minute).padStart(2, "0");
  const ss = String(p.second).padStart(2, "0");
  return withSeconds ? `${ampm} ${hh}:${mm}:${ss}` : `${ampm} ${hh}:${mm}`;
}

/** "14:00" → "오후 2:00" */
export function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(m ?? 0).padStart(2, "0")}`;
}

export function addDays(iso: string, n: number) {
  return toISO(dfAddDays(fromISO(iso), n));
}

/**
 * 다가오는 토요일 (오늘이 토요일이면 오늘).
 * 결혼 준비 일정은 식장 방문 · 피팅처럼 주말에 몰려서 '이번 주말' 이 자주 쓰인다.
 */
export function nextWeekend(today: string = todayISO()): string {
  const day = fromISO(today).getUTCDay(); // 0=일 … 6=토
  return addDays(today, day === 6 ? 0 : 6 - day);
}

export function thisWeekRange(today: string = todayISO()) {
  const d = fromISO(today);
  return {
    start: toISO(startOfWeek(d, { weekStartsOn: 1 })),
    end: toISO(endOfWeek(d, { weekStartsOn: 1 })),
  };
}

export function inRange(iso: string | null | undefined, start: string, end: string) {
  return !!iso && iso >= start && iso <= end;
}

export function monthGrid(year: number, month: number) {
  const first = startOfMonth(new Date(year, month - 1, 1));
  const last = endOfMonth(first);
  const gridStart = startOfWeek(first, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(last, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((d) => ({
    iso: toISO(d),
    day: d.getDate(),
    inMonth: d.getMonth() === month - 1,
  }));
}

export function relativeTime(isoDateTime: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(isoDateTime).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}개월 전`;
  return `${Math.floor(mo / 12)}년 전`;
}

export function monthLabel(year: number, month: number) {
  return `${year}년 ${month}월`;
}
