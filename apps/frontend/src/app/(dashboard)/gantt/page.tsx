"use client";

import React, { useEffect } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { GanttChart, GanttLegend } from "@/components/gantt/GanttChart";
import { useLayoutStore } from "@/stores/layoutStore";

export default function GanttPage() {
  const { tasks, loadTasks, subscribeSocket } = useTaskStore();
  const { openRightPanel } = useLayoutStore();
  useEffect(() => {
    loadTasks();
    const unsub = subscribeSocket();
    return unsub;
  }, [loadTasks, subscribeSocket]);
  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-bold text-slate-900">간트 차트</h1>
      <GanttLegend />
      <GanttChart
        tasks={tasks}
        onTaskClick={(t) =>
          openRightPanel(
            <div className="space-y-2">
              <h3 className="text-base font-semibold">{t.title}</h3>
              <p className="text-sm text-slate-600">{t.content}</p>
            </div>
          )
        }
      />
    </div>
  );
}
