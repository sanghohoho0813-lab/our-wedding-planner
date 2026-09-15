export function QuoteCard() {
  return (
    <div className="relative overflow-hidden rounded-[22px] border border-line bg-accent-softer p-6 min-h-[11rem] flex flex-col justify-between">
      <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-accent-soft/70 blur-2xl" />
      <svg viewBox="0 0 120 80" className="pointer-events-none absolute right-4 bottom-4 h-16 w-24 text-accent/60" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="45" cy="45" r="24" />
        <circle cx="72" cy="38" r="24" />
        <path d="M72 8l6 7-6 8-6-8z" fill="currentColor" stroke="none" opacity="0.6" />
      </svg>
      <p className="relative font-hand text-[1.625rem] leading-snug text-fg">
        결혼은 끝이 아니라,
        <br />
        더 좋은 날들의 시작
      </p>
      <p className="relative mt-4 text-[0.9375rem] text-fg-2">우리, 잘하고 있어요 ♡</p>
    </div>
  );
}
