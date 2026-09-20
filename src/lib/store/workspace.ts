"use client";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, LOCAL_USER_ID, LOCAL_WEDDING_ID } from "@/lib/config";

export interface Workspace {
  weddingId: string | null;
  userId: string | null;
  email: string | null;
  /** 가입할 때 적은 이름(없으면 null) */
  name: string | null;
  mode: "local" | "supabase";
  state: "loading" | "ready" | "no-workspace" | "signed-out" | "error";
  error?: string;
}

const LOCAL: Workspace = { weddingId: LOCAL_WEDDING_ID, userId: LOCAL_USER_ID, email: null, name: null, mode: "local", state: "ready" };

/**
 * 워크스페이스(결혼 공간) 결정.
 * 서버 레이아웃에서 하던 일을 클라이언트로 옮겨, 메뉴를 옮길 때마다 서버 왕복이 생기지 않게 한다.
 * 인증 보호는 middleware 가 계속 담당한다.
 */
/**
 * 검사 하네스가 심어 둔 워크스페이스.
 * 두 사람이 동시에 쓰는 상황을 검증하려면 브라우저 컨텍스트마다 다른 사용자여야 하는데,
 * 운영 Supabase 로 실제 로그인을 할 수는 없어서 만든 통로다.
 * 앱은 이 전역을 어디서도 설정하지 않는다. (qa/realtime.mjs 참고)
 */
function injectedWorkspace(): Workspace | null {
  if (typeof window === "undefined") return null;
  const w = (window as { __owpTestWorkspace?: Partial<Workspace> }).__owpTestWorkspace;
  return w?.weddingId ? { ...LOCAL, mode: "supabase", state: "ready", ...w } as Workspace : null;
}

export function useWorkspace(): Workspace {
  const [ws, setWs] = useState<Workspace>(
    () => injectedWorkspace() ?? (isSupabaseConfigured ? { ...LOCAL, weddingId: null, userId: null, mode: "supabase", state: "loading" } : LOCAL),
  );

  useEffect(() => {
    if (injectedWorkspace()) return;
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    void (async () => {
      try {
        const { getSupabaseBrowser } = await import("@/lib/supabase/client");
        const sb = getSupabaseBrowser();
        const { data: auth } = await sb.auth.getUser();
        if (cancelled) return;
        if (!auth.user) return setWs((p) => ({ ...p, state: "signed-out" }));
        const { data: member, error } = await sb
          .from("wedding_members")
          .select("wedding_id")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error) return setWs((p) => ({ ...p, state: "error", error: error.message }));
        const name = (auth.user.user_metadata?.display_name as string | undefined)?.trim() || null;
        if (!member) return setWs({ weddingId: null, userId: auth.user.id, email: auth.user.email ?? null, name, mode: "supabase", state: "no-workspace" });
        setWs({ weddingId: member.wedding_id as string, userId: auth.user.id, email: auth.user.email ?? null, name, mode: "supabase", state: "ready" });
      } catch (e) {
        if (!cancelled) setWs((p) => ({ ...p, state: "error", error: e instanceof Error ? e.message : "연결에 실패했어요." }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ws;
}
