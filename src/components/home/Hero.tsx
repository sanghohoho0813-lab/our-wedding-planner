"use client";
import { Sun } from "lucide-react";
import { daysUntil, formatDDay, formatKoreanDate, safeWeddingDate, todayISO } from "@/lib/date";
import { DEFAULT_WEDDING_DATE } from "@/lib/config";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useNow } from "@/lib/hooks";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { LiveClock } from "./LiveClock";

function FloralArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M20 180c30-40 40-90 60-130" />
      <path d="M50 150c18-8 26-24 26-40M70 118c-16-4-30 2-40 14M92 84c-14-2-24 6-30 18M64 62c10 10 26 12 40 4" />
      <circle cx="98" cy="46" r="10" />
      <circle cx="98" cy="46" r="4" fill="currentColor" stroke="none" opacity="0.5" />
      <path d="M150 190c10-40 30-80 35-140" />
      <path d="M160 150c14-2 24-12 26-26M168 116c-12-6-26-2-32 10M182 84c-10 0-18 8-20 18" />
      <circle cx="184" cy="52" r="8" />
    </svg>
  );
}

export function Hero() {
  const wedding = useWeddingStore((s) => s.data!.wedding);
  const now = useNow(60_000);
  const today = todayISO(now ?? new Date());
  const { date: weddingDate, valid: dateValid, raw } = safeWeddingDate(wedding.wedding_date, DEFAULT_WEDDING_DATE);
  const days = daysUntil(weddingDate, today);
  const dday = formatDDay(days);
  const names = [wedding.groom_name, wedding.bride_name].filter(Boolean).join(" · ");

  return (
    <>
      {!dateValid && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[14px] border border-warning/50 bg-warning-soft px-4 py-3">
          <AlertTriangle className="size-5 shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-[0.9375rem] text-fg">
            저장된 결혼식 날짜{raw ? ` (${raw})` : ""}를 읽을 수 없어 임시로 {formatKoreanDate(weddingDate)}로 표시하고 있어요.
          </p>
          <Link href="/settings" className="rounded-full bg-warning px-3.5 py-2 text-[0.875rem] font-medium text-white">
            날짜 고치기
          </Link>
        </div>
      )}
    <section className="grid gap-3 lg:grid-cols-[1.15fr_1fr_0.85fr]">
      <div className="relative order-2 hidden overflow-hidden rounded-[22px] border border-line hero-gradient p-6 lg:order-1 lg:block">
        <FloralArt className="pointer-events-none absolute -right-4 -bottom-6 h-44 w-44 text-accent/40" />
        <p className="font-hand text-[2.125rem] leading-tight text-fg">
          좋은 날,
          <br />
          우리의 이야기
        </p>
        <p className="mt-4 max-w-[16rem] text-[0.9375rem] leading-relaxed text-fg-2">
          하나하나 준비하는 모든 순간이
          <br />
          소중한 추억이 될 거예요.
        </p>
        {names && <p className="mt-6 text-[0.875rem] font-medium text-accent-text">{names}</p>}
      </div>

      <div className="relative order-1 overflow-hidden rounded-[22px] border border-line bg-surface px-6 py-7 text-center shadow-[var(--shadow-sm)] lg:order-2">
        <FloralArt className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 text-accent/25 lg:hidden" />
        <p className="text-[1rem] font-medium text-fg-2">우리 결혼식까지</p>
        <p className="mt-1 font-script text-[4rem] leading-none text-accent-text sm:text-[4.5rem]" aria-label={`디데이 ${dday}`}>
          {dday}
        </p>
        <p className="mt-2 text-[1rem] font-medium text-fg">{formatKoreanDate(weddingDate)}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-1.5 text-[0.875rem]">
          <Sun className="size-4 text-warning" />
          <LiveClock />
        </div>
        <p className="mt-4 text-[0.8125rem] text-fg-3">“지금 이 순간도, 우리의 결혼을 만들어가는 날이에요.”</p>
      </div>

      <div className="relative order-3 hidden overflow-hidden rounded-[22px] border border-line bg-accent-softer p-6 lg:block">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-accent-soft/80 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-6 size-36 rounded-full bg-[var(--gold)]/20 blur-2xl" />
        <p className="relative text-[1.25rem] font-semibold leading-relaxed text-fg">
          좋은 하루예요!
          <br />
          오늘도
          <br />
          행복한 준비 되세요 ♡
        </p>
        <p className="relative mt-4 text-[0.875rem] text-fg-3">{days > 0 ? `${days}일 남았어요. 하나씩 차근차근.` : days === 0 ? "드디어 오늘! 축하해요." : "결혼을 축하해요."}</p>
      </div>
    </section>
    </>
  );
}
