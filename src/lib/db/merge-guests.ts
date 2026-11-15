import type { Guest } from "./types";
import { guestKey } from "./handoff";

/**
 * 다른 기기(예: Supabase 연결 전의 폰)에서 받은 백업의 하객을 지금 명단에 합친다.
 *
 * 폰에서는 새 사람을 적기도 했지만, 원래 명단의 사람을 '진주리 → 진주리 부부' 처럼 고치거나
 * 신랑측 → 공통으로 옮기기도 했다. CSV 로 '더하기' 만 하면 이런 수정은 넘어오지 않거나 같은 사람이 둘이 된다.
 *
 * 원칙 (세 갈래 비교: 원래 명단 · 폰 · 지금 명단)
 * - 폰에만 있는 새 사람 → 더한다. 이름 · 측이 같은 사람이 이미 있으면 건너뛴다.
 * - 원래 명단의 사람을 폰에서 고쳤고, 지금 명단에서는 그 칸을 아무도 안 고쳤다 → 폰 값으로 바꾼다.
 * - 지금 명단에서 이미 고친 칸 → 그대로 둔다 (상대가 나중에 고친 것을 덮지 않는다).
 * - 폰에서 지운 원래 사람(부부로 합치며 지운 경우 등) → 지금 명단에서도 지운다. 단, 지금 명단에서 고친 적 있으면 둔다.
 */

export const MERGE_FIELDS = ["name", "side", "relation", "rsvp", "companions", "meal", "contacted", "invitation_sent", "invitation_method", "memo"] as const;
type Field = (typeof MERGE_FIELDS)[number];

export interface MergeUpdate {
  target: Guest;
  patch: Partial<Guest>;
}
export interface GuestMergePlan {
  add: Guest[];
  update: MergeUpdate[];
  remove: Guest[];
  /** 지금 명단에서 이미 다르게 고쳐서 그대로 두는 것 */
  kept: { target: Guest; fields: Field[] }[];
}

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null) || (typeof a === "string" && typeof b === "string" && a.trim() === b.trim());

export function planGuestMerge(backup: Guest[], current: Guest[], lineage: Map<string, Guest>): GuestMergePlan {
  const plan: GuestMergePlan = { add: [], update: [], remove: [], kept: [] };
  // 지금 명단: 원래 사람 → 그 행
  const currentByOrig = new Map<string, Guest>();
  for (const g of current) {
    const o = lineage.get(g.id);
    if (o) currentByOrig.set(o.id, g);
  }
  const haveKey = new Set(current.map(guestKey));
  const seenOrig = new Set<string>();

  for (const b of backup) {
    if (!b?.name?.trim()) continue;
    const o = lineage.get(b.id);
    const target = o ? currentByOrig.get(o.id) : undefined;
    if (o) seenOrig.add(o.id);
    if (o && target) {
      const patch: Partial<Guest> = {};
      const kept: Field[] = [];
      for (const f of MERGE_FIELDS) {
        if (same(b[f], o[f])) continue; // 폰에서 안 고친 칸
        if (same(target[f], b[f])) continue; // 이미 같다
        if (same(target[f], o[f])) (patch as Record<string, unknown>)[f] = b[f];
        else kept.push(f); // 지금 명단에서 이미 다르게 고침
      }
      if (Object.keys(patch).length) plan.update.push({ target, patch });
      if (kept.length) plan.kept.push({ target, fields: kept });
      continue;
    }
    // 새 사람 (또는 지금 명단에서 원래 사람이 이미 지워진 경우)
    const k = guestKey(b);
    if (haveKey.has(k)) continue;
    haveKey.add(k);
    plan.add.push(b);
  }

  // 폰에서 지운 원래 사람 — 백업이 원래 명단에서 출발한 경우에만 판단한다 (아무 백업이나 넣어 원래 명단이 지워지면 안 된다)
  if (seenOrig.size > 0) {
    for (const [origId, target] of currentByOrig) {
      if (seenOrig.has(origId)) continue;
      const o = lineage.get(target.id)!;
      const untouched = MERGE_FIELDS.every((f) => same(target[f], o[f]));
      if (untouched) plan.remove.push(target);
      else plan.kept.push({ target, fields: [] });
    }
  }
  return plan;
}
