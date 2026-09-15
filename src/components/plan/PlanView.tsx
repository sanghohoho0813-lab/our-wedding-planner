"use client";
import { useEffect } from "react";
import { computeProgress } from "@/lib/compute";
import { useTabs } from "@/lib/hooks";
import { useUIStore } from "@/lib/store/ui-store";
import { useWeddingStore } from "@/lib/store/wedding-store";
import { TabBar } from "@/components/layout/TabBar";
import { TasksView } from "@/components/tasks/TasksView";
import { CalendarView } from "@/components/calendar/CalendarView";

const TABS = ["tasks", "calendar"] as const;
type Tab = (typeof TABS)[number];

export function PlanView() {
  const [tab, setTab] = useTabs<Tab>(TABS, "tasks");
  const tasks = useWeddingStore((s) => s.data!.tasks);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const progress = computeProgress(tasks);

  useEffect(() => {
    setActiveTab(tab);
    return () => setActiveTab(null);
  }, [tab, setActiveTab]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="hidden text-[1.75rem] font-bold tracking-tight text-fg lg:block">할 일 · 일정</h1>
          <p className="text-[0.9375rem] text-fg-3">
            남은 일 {progress.remaining}개 · 완료 {progress.done}/{progress.total}
          </p>
        </div>
      </div>
      <TabBar
        className="mb-4 max-w-sm"
        tabs={[
          { value: "tasks", label: "할 일", badge: progress.remaining },
          { value: "calendar", label: "일정" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "tasks" ? <TasksView embedded /> : <CalendarView embedded />}
    </div>
  );
}
