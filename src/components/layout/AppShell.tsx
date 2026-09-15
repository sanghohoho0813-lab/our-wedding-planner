"use client";
import { useEffect } from "react";
import { getAdapter } from "@/lib/db";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { BottomNav } from "./BottomNav";
import { MenuDrawer } from "./MenuDrawer";
import { PageTransition } from "./PageTransition";
import { QuickAdd } from "./QuickAdd";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export interface AppShellProps {
  weddingId: string;
  userId: string;
  mode: "local" | "supabase";
  userEmail?: string | null;
  children: React.ReactNode;
}

export function AppShell({ weddingId, userId, children }: AppShellProps) {
  const status = useWeddingStore((s) => s.status);
  const error = useWeddingStore((s) => s.error);
  const currentId = useWeddingStore((s) => s.weddingId);
  const init = useWeddingStore((s) => s.init);
  const reload = useWeddingStore((s) => s.reload);

  useEffect(() => {
    if (currentId === weddingId && status !== "idle") return;
    void getAdapter().then((adapter) => init(adapter, weddingId, userId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weddingId, userId]);

  const ready = status === "ready" && currentId === weddingId;

  return (
    <div className="min-h-dvh lg:pl-[var(--sidebar-w)]">
      <Sidebar />
      <TopBar />
      <main className="mx-auto w-full max-w-[1200px] px-4 pt-4 pb-[calc(var(--nav-h)+5.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 lg:pt-6 lg:pb-12">
        {ready ? (
          <PageTransition>{children}</PageTransition>
        ) : status === "error" ? (
          <div className="card mx-auto mt-10 max-w-md p-6 text-center">
            <p className="font-semibold text-fg">데이터를 불러오지 못했어요</p>
            <p className="mt-1 text-[0.875rem] text-fg-3">{error}</p>
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
      {ready && <QuickAdd />}
    </div>
  );
}
