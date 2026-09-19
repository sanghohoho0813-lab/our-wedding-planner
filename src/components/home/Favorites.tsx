"use client";
import { Star } from "lucide-react";
import Link from "next/link";
import { formatKRW } from "@/lib/money";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { VENDOR_CATEGORY_LABEL } from "@/lib/labels";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useUIStore } from "@/lib/store/ui-store";
import { EmptyState } from "@/components/ui/EmptyState";

export interface FavoriteEntry {
  key: string;
  kind: string;
  title: string;
  sub: string | null;
  href: string;
}

export function useFavorites(): FavoriteEntry[] {
  const data = useWeddingStore((s) => s.data!);
  const out: FavoriteEntry[] = [];
  for (const t of data.tasks) if (t.is_favorite) out.push({ key: `t:${t.id}`, kind: "할 일", title: t.title, sub: t.category, href: "/plan?filter=favorite" });
  for (const b of data.budget_items) if (b.is_favorite) out.push({ key: `b:${b.id}`, kind: "예산", title: b.name, sub: formatKRW(b.actual_amount || b.estimated_amount), href: "/budget?tab=items&filter=favorite" });
  for (const v of data.vendors) if (v.is_favorite) out.push({ key: `v:${v.id}`, kind: VENDOR_CATEGORY_LABEL[v.category], title: v.name, sub: v.contact_name, href: `/wedding?tab=${v.category}` });
  for (const v of data.venues) if (v.is_favorite) out.push({ key: `ve:${v.id}`, kind: "식장", title: v.name, sub: v.address, href: "/wedding?tab=venue" });
  for (const o of data.outfit_items) if (o.is_favorite) out.push({ key: `o:${o.id}`, kind: "예복", title: o.kind, sub: o.vendor_name, href: "/wedding?tab=outfit" });
  return out;
}

export function Favorites({ limit = 6 , className }: { limit?: number ; className?: string }) {
  const favs = useFavorites();
  const setSheet = useUIStore((st) => st.setHomeSheet);
  return (
    <Card tint="neutral" className={className}>
      <CardHeader tint="neutral" title="즐겨찾기" icon={<Star />} action={<Button size="sm" variant="ghost" onClick={() => setSheet("favorites")}>전체 보기</Button>} />
      {favs.length === 0 ? (
        <EmptyState compact title="즐겨찾기한 항목이 없어요" description="자주 확인하는 할 일, 예산, 업체에 별표를 눌러보세요." />
      ) : (
        <ul className="px-2 pb-2">
          {favs.slice(0, limit).map((f) => (
            <li key={f.key}>
              <Link href={f.href} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 hover:bg-surface-2">
                <Star className="size-4 shrink-0 fill-warning text-warning" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[1rem] font-medium text-fg">{f.title}</span>
                  <span className="block truncate text-[0.8125rem] text-fg-3">{[f.kind, f.sub].filter(Boolean).join(" · ")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
