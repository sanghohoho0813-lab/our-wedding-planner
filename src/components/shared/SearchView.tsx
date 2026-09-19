"use client";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { searchAll } from "@/lib/compute";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputCls } from "@/components/ui/Field";
import { PageHeader } from "@/components/layout/PageHeader";

const RECENT_KEY = "owp:recentSearches";

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((v): v is string => typeof v === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const data = useWeddingStore((s) => s.data!);
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { scroll: false }), 300);
    return () => clearTimeout(t);
  }, [q, router]);
  // 최근에 찾은 말은 기억해 둔다. 결혼 준비는 같은 걸 며칠에 걸쳐 다시 찾게 된다.
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => setRecent(readRecent()), []);
  const remember = useCallback((term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    const next = [t, ...readRecent().filter((v) => v !== t)].slice(0, 8);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* 저장이 막혀 있어도 검색은 된다 */
    }
    setRecent(next);
  }, []);

  const results = searchAll(data, q);
  useEffect(() => {
    if (!q.trim() || results.length === 0) return;
    const t = setTimeout(() => remember(q), 1200);
    return () => clearTimeout(t);
  }, [q, results.length, remember]);
  const groups = new Map<string, typeof results>();
  for (const r of results) groups.set(r.kind, [...(groups.get(r.kind) ?? []), r]);

  return (
    <div>
      <PageHeader title="검색" description="할 일, 예산, 업체, 일정, 하객, 메모를 한 번에 찾아요">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-fg-3" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: 스냅, 부케, 김OO" className={`${inputCls} h-12 rounded-full pl-12 text-[1.0625rem]`} />
        </label>
      </PageHeader>
      {!q.trim() ? (
        <div className="space-y-4">
          {recent.length > 0 && (
            <section className="card px-4 py-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[0.875rem] font-semibold text-fg-2">최근 찾은 말</h2>
                <button
                  type="button"
                  className="text-[0.8125rem] text-fg-3 hover:text-accent"
                  onClick={() => {
                    try {
                      localStorage.removeItem(RECENT_KEY);
                    } catch {
                      /* 무시 */
                    }
                    setRecent([]);
                  }}
                >
                  지우기
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((t) => (
                  <Chip key={t} size="sm" onClick={() => setQ(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </section>
          )}
          <div className="card">
            <EmptyState
              icon={<Search />}
              title="무엇을 찾을까요?"
              description="업체 이름, 하객 이름, 할 일, 예산 항목, 메모까지 한 번에 찾아요."
            />
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Search />} title={`'${q}'에 대한 결과가 없어요`} description="다른 검색어로 시도해 보세요." />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[0.875rem] text-fg-3">{results.length}개 결과</p>
          {[...groups.entries()].map(([kind, items]) => (
            <section key={kind} className="card overflow-hidden">
              <h2 className="border-b border-line px-4 py-2 text-[0.8125rem] font-semibold text-fg-3">{kind}</h2>
              <ul className="divide-y divide-line">
                {items.map((r) => (
                  <li key={r.key}>
                    <Link href={r.href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[1rem] font-medium text-fg">{r.title}</span>
                        {r.subtitle && <span className="block truncate text-[0.8125rem] text-fg-3">{r.subtitle}</span>}
                      </span>
                      <Badge>{kind}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
