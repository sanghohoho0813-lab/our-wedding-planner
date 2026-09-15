import type { WeddingData } from "@/lib/db/types";
import { MUSIC_SLOT_LABEL, VENDOR_CATEGORY_LABEL } from "@/lib/labels";

export interface SearchResult {
  key: string;
  kind: string;
  title: string;
  subtitle: string | null;
  href: string;
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase();

export function searchAll(data: WeddingData, query: string, limit = 40): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hit = (...fields: (string | null | undefined)[]) => fields.some((f) => norm(f).includes(q));
  const out: SearchResult[] = [];

  for (const t of data.tasks) if (hit(t.title, t.memo, t.category)) out.push({ key: `t:${t.id}`, kind: "할 일", title: t.title, subtitle: t.category, href: `/tasks?q=${encodeURIComponent(query)}` });
  for (const b of data.budget_items) if (hit(b.name, b.memo, b.vendor_name)) out.push({ key: `b:${b.id}`, kind: "예산", title: b.name, subtitle: b.vendor_name, href: `/budget/items?q=${encodeURIComponent(query)}` });
  for (const v of data.vendors) if (hit(v.name, v.memo, v.contact_name)) out.push({ key: `v:${v.id}`, kind: VENDOR_CATEGORY_LABEL[v.category], title: v.name, subtitle: v.memo, href: `/vendors/${v.category}` });
  for (const v of data.venues) if (hit(v.name, v.memo, v.address, v.notes)) out.push({ key: `ve:${v.id}`, kind: "식장", title: v.name, subtitle: v.address, href: "/venue" });
  for (const e of data.events) if (hit(e.title, e.memo, e.location)) out.push({ key: `e:${e.id}`, kind: "일정", title: e.title, subtitle: e.date, href: `/calendar?date=${e.date}` });
  for (const g of data.guests) if (hit(g.name, g.memo, g.relation)) out.push({ key: `g:${g.id}`, kind: "하객", title: g.name, subtitle: g.relation, href: `/guests?q=${encodeURIComponent(query)}` });
  for (const m of data.memos) if (hit(m.content)) out.push({ key: `m:${m.id}`, kind: "메모", title: m.content.slice(0, 60), subtitle: null, href: "/memos" });
  for (const g of data.gifts) if (hit(g.recipient, g.item, g.memo)) out.push({ key: `gi:${g.id}`, kind: "선물", title: g.recipient, subtitle: g.item, href: "/gifts" });
  for (const m of data.invitation_meetings) if (hit(m.title, m.target, m.place, m.memo)) out.push({ key: `im:${m.id}`, kind: "청첩장 모임", title: m.title, subtitle: m.place, href: "/meetings" });
  for (const m of data.music_items) if (hit(m.title, m.artist, m.memo)) out.push({ key: `mu:${m.id}`, kind: `음악 · ${MUSIC_SLOT_LABEL[m.slot]}`, title: m.title, subtitle: m.artist, href: "/music" });
  for (const o of data.outfit_items) if (hit(o.kind, o.vendor_name, o.memo)) out.push({ key: `o:${o.id}`, kind: "예복", title: o.kind, subtitle: o.vendor_name, href: "/outfit" });
  for (const h of data.honeymoon_items) if (hit(h.title, h.memo)) out.push({ key: `h:${h.id}`, kind: "신혼여행", title: h.title, subtitle: null, href: "/honeymoon" });

  return out.slice(0, limit);
}
