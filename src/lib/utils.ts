import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}

/** 한국어 조사 처리: josa("청첩장", "이/가") → "청첩장이", josa("불참", "(으)로") → "불참으로" */
export function josa(word: string, pair: "이/가" | "을/를" | "은/는" | "과/와" | "(으)로"): string {
  const last = word.charCodeAt(word.length - 1);
  const korean = last >= 0xac00 && last <= 0xd7a3;
  const final = korean ? (last - 0xac00) % 28 : 0;
  // '(으)로' 는 받침이 없거나 'ㄹ' 받침이면 '로'
  if (pair === "(으)로") return `${word}${!korean || final === 0 || final === 8 ? "로" : "으로"}`;
  const [withFinal, withoutFinal] = pair.split("/");
  return `${word}${korean && final !== 0 ? withFinal : withoutFinal}`;
}

/** 조사만 떼어 온다: 따옴표 뒤에 붙일 때 쓴다 — `'${v}'${particle(v, "(으)로")}` */
export function particle(word: string, pair: Parameters<typeof josa>[1]): string {
  return josa(word, pair).slice(word.length);
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
