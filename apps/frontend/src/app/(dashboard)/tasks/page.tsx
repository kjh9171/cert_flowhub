"use client";

import React, { useEffect } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { ViewSwitcher } from "@/components/common/ViewSwitcher";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { GanttChart, GanttLegend } from "@/components/gantt/GanttChart";
import { CalendarView } from "@/components/calendar/CalendarView";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

export default function TasksPage() {
  const { tasks, view, setView, loadTasks, subscribeSocket } = useTaskStore();
  useEffect(() => {
    loadTasks();
    const unsub = subscribeSocket();
    return unsub;
  }, [loadTasks, subscribeSocket]);
  const { openRightPanel } = useLayoutStore();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">작업</h1>
          <p className="text-sm text-slate-500">프로젝트 작업을 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitcher value={view} onChange={setView} />
          <Button size="sm">
            <Plus className="h-4 w-4" /> 새 작업
          </Button>
        </div>
      </div>

      {view === "KANBAN" && (
        <KanbanBoard
          tasks={tasks}
          onStatusChange={(id, status) => useTaskStore.getState().moveTaskStatus(id, status)}
          onTaskClick={(t) =>
            openRightPanel(
              <div className="space-y-2">
                <h3 className="text-base font-semibold">{t.title}</h3>
                <p className="text-sm text-slate-600">{t.content}</p>
              </div>
            )
          }
        />
      )}
      {view === "GANTT" && (
        <div className="space-y-3">
          <GanttLegend />
          <GanttChart tasks={tasks} />
        </div>
      )}
      {view === "CALENDAR" && <CalendarView tasks={tasks} />}
      {view === "FEED" && (
        <p className="text-sm text-slate-400">피드 뷰는 대시보드에서 확인하세요.</p>
      )}
    </div>
  );
}
