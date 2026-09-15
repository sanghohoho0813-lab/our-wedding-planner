"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccentKey, FontScale, ThemeMode } from "@/lib/db/types";

export const ACCENTS: { key: AccentKey; label: string; color: string }[] = [
  { key: "rose", label: "Rose", color: "#C98E88" },
  { key: "terracotta", label: "Terracotta", color: "#C97B5A" },
  { key: "sage", label: "Sage", color: "#7F9A7B" },
  { key: "blue", label: "Blue", color: "#7D93B0" },
  { key: "gold", label: "Gold", color: "#C2A15A" },
];

export const FONT_SCALES: { value: FontScale; label: string }[] = [
  { value: 0.9, label: "작게" },
  { value: 1, label: "보통" },
  { value: 1.1, label: "크게" },
  { value: 1.2, label: "매우 크게" },
];

interface SettingsState {
  theme: ThemeMode;
  accent: AccentKey;
  fontScale: FontScale;
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: AccentKey) => void;
  setFontScale: (f: FontScale) => void;
  hydrate: (s: { theme?: ThemeMode; accent?: AccentKey; fontScale?: FontScale }) => void;
}

export function applySettingsToDOM(s: { theme: ThemeMode; accent: AccentKey; fontScale: FontScale }) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const resolved =
    s.theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : s.theme;
  root.dataset.theme = resolved;
  root.dataset.accent = s.accent;
  root.style.setProperty("--font-scale", String(s.fontScale));
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#1c1a18" : "#f8f3ef");
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "system",
      accent: "rose",
      fontScale: 1,
      setTheme: (theme) => {
        set({ theme });
        applySettingsToDOM(get());
      },
      setAccent: (accent) => {
        set({ accent });
        applySettingsToDOM(get());
      },
      setFontScale: (fontScale) => {
        set({ fontScale });
        applySettingsToDOM(get());
      },
      hydrate: (s) => {
        set({ ...s });
        applySettingsToDOM(get());
      },
    }),
    { name: "owp:settings", partialize: (s) => ({ theme: s.theme, accent: s.accent, fontScale: s.fontScale }) },
  ),
);

/** layout.tsx에 인라인으로 삽입해 첫 페인트 전에 테마를 적용 */
export const THEME_INIT_SCRIPT = `
(function(){try{
var raw=localStorage.getItem('owp:settings');var s=raw?JSON.parse(raw).state||{}:{};
var theme=s.theme||'system';var accent=s.accent||'rose';var fs=s.fontScale||1;
var dark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;r.dataset.theme=dark?'dark':'light';r.dataset.accent=accent;r.style.setProperty('--font-scale',String(fs));r.style.colorScheme=dark?'dark':'light';
}catch(e){}})();`;
