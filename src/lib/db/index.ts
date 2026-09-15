"use client";
import { isSupabaseConfigured } from "@/lib/config";
import type { DataAdapter } from "./adapter";
import { LocalAdapter } from "./local";

let adapter: DataAdapter | null = null;

export async function getAdapter(): Promise<DataAdapter> {
  if (adapter) return adapter;
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
