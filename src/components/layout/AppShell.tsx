"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getAdapter } from "@/lib/db";
import { useWorkspace } from "@/lib/store/workspace";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { BottomNav } from "./BottomNav";
import { HomeSheets } from "./HomeSheets";
import { MenuDrawer } from "./MenuDrawer";
import { PageTransition } from "./PageTransition";
import { QuickAdd } from "./QuickAdd";
import { Sidebar } from "./Sidebar";
import { SettingsSync } from "./SettingsSync";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const ws = useWorkspace();
  const router = useRouter();
  const status = useWeddingStore((s) => s.status);
  const error = useWeddingStore((s) => s.error);
  const currentId = useWeddingStore((s) => s.weddingId);
  const init = useWeddingStore((s) => s.init);
  const reload = useWeddingStore((s) => s.reload);

  useEffect(() => {
    if (ws.state === "signed-out") router.replace("/login");
    else if (ws.state === "no-workspace") router.replace("/onboarding");
  }, [ws.state, router]);

  useEffect(() => {
    if (ws.state !== "ready" || !ws.weddingId) return;
    if (currentId === ws.weddingId && status !== "idle") return;
    void getAdapter().then((adapter) => init(adapter, ws.weddingId!, ws.userId ?? ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.state, ws.weddingId]);

  const ready = status === "ready" && !!ws.weddingId && currentId === ws.weddingId;
  const failed = status === "error" || ws.state === "error";

  return (
    <div className="min-h-dvh lg:pl-[var(--sidebar-w)]">
      <Sidebar />
      <TopBar />
      <main className="page-shell px-4 pt-4 pb-[calc(var(--nav-h)+5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 lg:pt-6 lg:pb-14">
        {ready ? (
          <PageTransition>{children}</PageTransition>
        ) : failed ? (
          <div className="card mx-auto mt-10 max-w-md p-6 text-center">
            <p className="font-semibold text-fg">데이터를 불러오지 못했어요</p>
            <p className="mt-1 text-[0.9375rem] text-fg-3">{error ?? ws.error}</p>
            <Button className="mt-4" onClick={() => reload()}>
              다시 시도
            </Button>
          </div>
        ) : (
          <PageSkeleton />
        )}
      </main>
      <BottomNav />
      <MenuDrawer />
      {ready && (
        <>
          <QuickAdd />
          <HomeSheets />
        </>
      )}
      {ws.mode === "supabase" && ws.userId && <SettingsSync userId={ws.userId} />}
    </div>
  );
}
