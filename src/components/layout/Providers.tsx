"use client";
import { useEffect } from "react";
import { applySettingsToDOM, useSettingsStore } from "@/lib/store/settings-store";
import { Toaster } from "@/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applySettingsToDOM(useSettingsStore.getState());
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (useSettingsStore.getState().theme === "system") applySettingsToDOM(useSettingsStore.getState());
    };
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
