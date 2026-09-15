"use client";
import { Star } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { useFavorites } from "./Favorites";

export function FavoritesPage() {
  const favs = useFavorites();
  const groups = new Map<string, typeof favs>();
  for (const f of favs) groups.set(f.kind, [...(groups.get(f.kind) ?? []), f]);
  return (
    <div>
      <PageHeader title="즐겨찾기" description="별표한 항목을 한 곳에서 빠르게 확인해요" />
      {favs.length === 0 ? (
        <div className="card">
          <EmptyState icon={<Star />} title="즐겨찾기한 항목이 없어요" description="할 일, 예산, 업체, 식장, 예복 카드의 별표를 눌러 추가할 수 있어요." />
        </div>
      ) : (
        <div className="space-y-4">
          {[...groups.entries()].map(([kind, items]) => (
            <section key={kind} className="card overflow-hidden">
              <h2 className="border-b border-line px-4 py-2 text-[0.75rem] font-semibold text-fg-3">{kind}</h2>
              <ul className="divide-y divide-line">
                {items.map((f) => (
                  <li key={f.key}>
                    <Link href={f.href} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                      <Star className="size-4 shrink-0 fill-warning text-warning" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-medium text-fg">{f.title}</span>
                        {f.sub && <span className="block truncate text-[0.75rem] text-fg-3">{f.sub}</span>}
                      </span>
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
