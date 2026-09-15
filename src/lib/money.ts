const krw = new Intl.NumberFormat("ko-KR");

export function formatNumber(n: number | null | undefined): string {
  return krw.format(Math.round(n ?? 0));
}

export function formatKRW(n: number | null | undefined): string {
  const v = Math.round(n ?? 0);
  return v < 0 ? `-₩${krw.format(Math.abs(v))}` : `₩${krw.format(v)}`;
}

export function formatSignedKRW(n: number): string {
  const v = Math.round(n);
  if (v === 0) return "±₩0";
  return v > 0 ? `+₩${krw.format(v)}` : `-₩${krw.format(Math.abs(v))}`;
}

/** 1,500,000 → "150만", 25,000,000 → "2,500만", 120,000,000 → "1억 2,000만" */
export function formatCompactKRW(n: number): string {
  const v = Math.round(n);
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs < 10000) return `${sign}${krw.format(abs)}원`;
  const eok = Math.floor(abs / 100000000);
  const man = Math.round((abs % 100000000) / 10000);
  if (eok > 0) return man > 0 ? `${sign}${eok}억 ${krw.format(man)}만` : `${sign}${eok}억`;
  return `${sign}${krw.format(man)}만`;
}

export function pct(part: number, total: number, digits = 1): number {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(digits));
}

export function formatPct(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPct(value: number, digits = 1) {
  if (value === 0) return "0.0%";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function parseAmount(raw: string): number {
  const digits = raw.replace(/[^\d-]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
}
