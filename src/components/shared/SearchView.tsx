"use client";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { searchAll } from "@/lib/compute";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputCls } from "@/components/ui/Field";
import { PageHeader } from "@/components/layout/PageHeader";

export function SearchView() {
  const params = useSearchParams();
  const router = useRouter();
  const data = useWeddingStore((s) => s.data!);
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => router.replace(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { scroll: false }), 300);
    return () => clearTimeout(t);
  }, [q, router]);
  const results = searchAll(data, q);
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
        <div className="card">
          <EmptyState icon={<Search />} title="무엇을 찾을까요?" description="검색어를 입력하면 모든 기록에서 찾아드려요." />
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
