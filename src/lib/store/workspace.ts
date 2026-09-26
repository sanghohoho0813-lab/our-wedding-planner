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
  /** 내가 속한 결혼 공간들 (보통 하나). 여러 개면 설정에서 골라 열 수 있다. */
  memberships?: Membership[];
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

/** 이 기기에서 열어 둔 결혼 공간 (여러 곳에 속해 있을 때 어디를 볼지) */
const PICK_KEY = "owp:weddingId";

export interface Membership {
  id: string;
  name: string;
  inviteCode: string;
}

export function readPickedWedding(): string | null {
  try {
    return localStorage.getItem(PICK_KEY);
  } catch {
    return null;
  }
}

/** 다른 공간으로 옮겨 본다. 화면 전체를 다시 불러와야 깔끔하다. */
export function pickWedding(id: string): void {
  try {
    localStorage.setItem(PICK_KEY, id);
  } catch {
    /* 저장이 막혀 있으면 이번 한 번만 바뀐다 */
  }
  if (typeof window !== "undefined") window.location.href = "/";
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
        // 한 사람이 여러 공간에 속할 수 있다(자기 공간을 만든 뒤 상대 초대 코드로도 참여한 경우).
        // 예전에는 제일 먼저 만든 곳만 열어서, 참여해 놓고도 빈 공간만 보였다.
        const { data: rows, error } = await sb
          .from("wedding_members")
          .select("wedding_id, created_at, weddings(name, invite_code)")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        if (error) return setWs((p) => ({ ...p, state: "error", error: error.message }));
        const list = (rows ?? []) as unknown as { wedding_id: string; weddings?: { name?: string; invite_code?: string } | null }[];
        const memberships: Membership[] = list.map((r) => ({
          id: r.wedding_id,
          name: r.weddings?.name ?? "결혼 준비 공간",
          inviteCode: r.weddings?.invite_code ?? "",
        }));
        const name = (auth.user.user_metadata?.display_name as string | undefined)?.trim() || null;
        if (memberships.length === 0)
          return setWs({ weddingId: null, userId: auth.user.id, email: auth.user.email ?? null, name, mode: "supabase", state: "no-workspace", memberships: [] });
        const picked = readPickedWedding();
        const chosen = (picked && memberships.find((m) => m.id === picked)?.id) || memberships[0].id;
        setWs({ weddingId: chosen, userId: auth.user.id, email: auth.user.email ?? null, name, mode: "supabase", state: "ready", memberships });
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
