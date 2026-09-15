import { Suspense } from "react";
import { TasksView } from "@/components/tasks/TasksView";

export const metadata = { title: "할 일" };

export default function TasksPage() {
  return (
    <Suspense>
      <TasksView />
    </Suspense>
  );
}
