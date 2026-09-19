import type { Wedding } from "@/lib/db/types";

/**
 * 이 공간을 쓰는 두 사람.
 *
 * 표를 새로 만들지 않고 weddings.details 안에 보관한다.
 * (Supabase 의 profiles 는 본인 것만 읽을 수 있어서 상대 이름을 가져올 수 없고,
 *  그걸 풀려면 SQL 을 또 실행해야 한다. 결혼 준비 앱에 두 명뿐이라 이 정도면 충분하다.)
 */
export type Side = "groom" | "bride";

export interface Member {
  name: string;
  side?: Side;
}
export type Members = Record<string, Member>;

export const SIDE_LABEL: Record<Side, string> = { groom: "신랑", bride: "신부" };

export function readMembers(wedding: Wedding): Members {
  const raw = (wedding.details as { members?: unknown } | undefined)?.members;
  if (!raw || typeof raw !== "object") return {};
  const out: Members = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const m = v as { name?: unknown; side?: unknown };
    out[id] = {
      name: typeof m.name === "string" ? m.name : "",
      side: m.side === "groom" || m.side === "bride" ? m.side : undefined,
    };
  }
  return out;
}

/** details 에 넣을 members 값을 만든다(기존 값은 보존). */
export function withMember(wedding: Wedding, userId: string, patch: Partial<Member>): Members {
  const members = readMembers(wedding);
  return { ...members, [userId]: { ...members[userId], ...patch, name: patch.name ?? members[userId]?.name ?? "" } };
}

/** 로그인한 사람의 이름. 없으면 이메일 앞부분, 그것도 없으면 빈 문자열. */
export function displayNameOf(member: Member | undefined, email: string | null, fallback = ""): string {
  if (member?.name?.trim()) return member.name.trim();
  if (email) return email.split("@")[0];
  return fallback;
}

/**
 * 기록을 남긴 사람을 화면에 보여줄 이름으로.
 * 이름이 없으면 신랑/신부, 그것도 없으면 '함께'.
 */
export function actorLabel(wedding: Wedding, userId: string | null | undefined): string | null {
  if (!userId) return null;
  const m = readMembers(wedding)[userId];
  if (m?.name?.trim()) return m.name.trim();
  if (m?.side) {
    const fromWedding = m.side === "groom" ? wedding.groom_name : wedding.bride_name;
    return fromWedding?.trim() || SIDE_LABEL[m.side];
  }
  return null;
}

/** 내가 신랑인지 신부인지. 정하지 않았으면 null. */
export function mySide(wedding: Wedding, userId: string | null | undefined): Side | null {
  if (!userId) return null;
  return readMembers(wedding)[userId]?.side ?? null;
}
