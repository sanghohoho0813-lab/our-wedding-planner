"use client";
import { isSupabaseConfigured } from "@/lib/config";
import type { DataAdapter } from "./adapter";
import { LocalAdapter } from "./local";

let adapter: DataAdapter | null = null;

export async function getAdapter(): Promise<DataAdapter> {
  if (adapter) return adapter;
  // 검사 하네스가 심어 둔 어댑터가 있으면 그걸 쓴다.
  // 두 사람이 동시에 쓰는 상황은 '두 클라이언트가 같은 백엔드에 붙어 있을 때' 만 제대로
  // 검증되는데, 운영 Supabase 에 테스트 데이터를 넣을 수는 없어서 만든 통로다.
  // 앱은 이 전역을 어디서도 설정하지 않으므로 평소에는 없는 길이다. (qa/relay.mjs 참고)
  const injected = (globalThis as { __owpTestAdapter?: DataAdapter }).__owpTestAdapter;
  if (injected) {
    adapter = injected;
    return adapter;
  }
  if (isSupabaseConfigured) {
    const [{ SupabaseAdapter }, { getSupabaseBrowser }] = await Promise.all([
      import("./supabase"),
      import("@/lib/supabase/client"),
    ]);
    adapter = new SupabaseAdapter(getSupabaseBrowser());
  } else {
    adapter = new LocalAdapter();
  }
  return adapter;
}
