"use client";
import { useEffect } from "react";
import type { AccentKey, FontScale, ThemeMode } from "@/lib/db/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useSettingsStore } from "@/lib/store/settings-store";

/** Supabase 모드에서 user_settings 테이블과 동기화 */
export function SettingsSync({ userId }: { userId: string }) {
  useEffect(() => {
    const sb = getSupabaseBrowser();
    let cancelled = false;
    void sb
      .from("user_settings")
      .select("theme, accent, font_scale")
      .eq("user_id", userId)
      .maybeSingle()
      .then((res: { data: { theme: string; accent: string; font_scale: number } | null }) => {
        const data = res.data;
        if (cancelled || !data) return;
        useSettingsStore.getState().hydrate({ theme: data.theme as ThemeMode, accent: data.accent as AccentKey, fontScale: Number(data.font_scale) as FontScale });
      });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useSettingsStore.subscribe((s, prev) => {
      if (s.theme === prev.theme && s.accent === prev.accent && s.fontScale === prev.fontScale) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void sb.from("user_settings").upsert({ user_id: userId, theme: s.theme, accent: s.accent, font_scale: s.fontScale });
      }, 600);
    });
    return () => {
      cancelled = true;
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [userId]);
  return null;
}
