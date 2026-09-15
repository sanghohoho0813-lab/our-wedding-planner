"use client";
import { useEffect } from "react";
import { applySettingsToDOM, useSettingsStore } from "@/lib/store/settings-store";
import { toast } from "@/lib/store/ui-store";
import { Toaster } from "@/components/ui/Toast";

/** 프로덕션에서만 서비스 워커를 등록한다(오프라인에서도 마지막 화면과 정적 파일을 연다). */
function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            toast("새 버전이 준비됐어요.", { duration: 8000, action: { label: "새로고침", onClick: () => window.location.reload() } });
          }
        });
      });
    })
    .catch(() => {
      /* 서비스 워커는 있으면 좋은 기능: 실패해도 앱은 그대로 동작한다 */
    });
}

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applySettingsToDOM(useSettingsStore.getState());
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (useSettingsStore.getState().theme === "system") applySettingsToDOM(useSettingsStore.getState());
    };
    m.addEventListener("change", onChange);
    registerServiceWorker();
    const onOffline = () => toast("오프라인이에요. 이 기기에는 계속 저장돼요.", { duration: 4000 });
    const onOnline = () => toast("다시 온라인이에요.", { duration: 2500, tone: "success" });
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      m.removeEventListener("change", onChange);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);
  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
