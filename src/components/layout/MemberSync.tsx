"use client";
import { useEffect } from "react";
import { displayNameOf, readMembers, withMember } from "@/lib/members";
import { useWeddingStore } from "@/lib/store/wedding-store";

/**
 * 이 공간에 내가 누구인지 한 번 적어 둔다.
 * 이름이 있어야 활동 기록에 "누가 고쳤는지" 가 보인다.
 * 이미 적혀 있으면 아무것도 하지 않는다.
 */
export function MemberSync({ userId, email, name }: { userId: string; email: string | null; name: string | null }) {
  const wedding = useWeddingStore((s) => s.data?.wedding);
  const updateWedding = useWeddingStore((s) => s.updateWedding);

  useEffect(() => {
    if (!wedding) return;
    if (readMembers(wedding)[userId]?.name) return;
    const wanted = (name ?? "").trim() || displayNameOf(undefined, email);
    if (!wanted) return;
    updateWedding(
      { details: { ...(wedding.details ?? {}), members: withMember(wedding, userId, { name: wanted }) } },
      { log: false },
    );
  }, [wedding, userId, email, name, updateWedding]);

  return null;
}
