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

export function toISO(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isValidISO(iso: string | null | undefined): iso is string {
  return !!iso && isValid(parseISO(iso));
}

/** target까지 남은 일수 (양수 = 미래) */
export function daysUntil(targetISO: string, today: string = todayISO()): number {
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
  return WEEKDAYS_KO[getDay(fromISO(iso))];
}

/** 2026년 12월 21일 (월) */
export function formatKoreanDate(iso: string, opts: { weekday?: boolean; year?: boolean } = {}) {
  const { weekday = true, year = true } = opts;
  const d = fromISO(iso);
  const base = year ? format(d, "yyyy년 M월 d일") : format(d, "M월 d일");
  return weekday ? `${base} (${WEEKDAYS_KO[getDay(d)]})` : base;
}

/** 9.17 (수) */
export function formatShortDate(iso: string, withWeekday = true) {
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
