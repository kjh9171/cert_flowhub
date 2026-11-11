"use client";

import React, { useEffect } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { CalendarView } from "@/components/calendar/CalendarView";
import { useLayoutStore } from "@/stores/layoutStore";

export default function CalendarPage() {
  const { tasks, loadTasks, subscribeSocket } = useTaskStore();
  const { openRightPanel } = useLayoutStore();
  useEffect(() => {
    loadTasks();
    const unsub = subscribeSocket();
    return unsub;
  }, [loadTasks, subscribeSocket]);
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">캘린더</h1>
      <CalendarView
        tasks={tasks}
        onTaskClick={(t) =>
          openRightPanel(
            <div className="space-y-2">
              <h3 className="text-base font-semibold">{t.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.content}</p>
            </div>
          )
        }
      />
    </div>
  );
}
