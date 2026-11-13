"use client";

import React, { useEffect, useState, useRef } from "react";
import { useTaskStore } from "@/stores/taskStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { ViewSwitcher } from "@/components/common/ViewSwitcher";
import api from "@/lib/api";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { GanttChart, GanttLegend } from "@/components/gantt/GanttChart";
import { CalendarView } from "@/components/calendar/CalendarView";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { TaskCreateModal } from "@/components/task/TaskCreateModal";
import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";

// Date → YYYY-MM-DD (로컬 기준, 타임존 오차 방지)
const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function TasksPage() {
  const { tasks, view, setView, loadTasks, subscribeSocket } = useTaskStore();
  const { openRightPanel } = useLayoutStore();
  const [modalOpen, setModalOpen] = useState(false);
  // 아바타 표시용: 실제 사용자 이름 매핑
  const [userMap, setUserMap] = useState<Record<string, { name: string }>>({});

  useEffect(() => {
    api.get("/users").then((res) => {
      const map: Record<string, { name: string }> = {};
      (res.data || []).forEach((u: any) => {
        map[u.id] = { name: u.name };
      });
      setUserMap(map);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadTasks();
    useTaskStore.getState().loadBadges(); // 연동 Badge 최신 목록 로드
    const unsub = subscribeSocket();
    return unsub;
  }, [loadTasks, subscribeSocket]);

  const reload = () => loadTasks();

  // ?task=<id> 진입 시 해당 작업 상세 패널 자동 오픈 (검색 결과 딥링크)
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (deepLinkedRef.current) return;
    const id = new URLSearchParams(window.location.search).get("task");
    if (!id) return;
    const found = tasks.find((t) => t.id === id);
    if (found) {
      deepLinkedRef.current = true;
      openRightPanel(<TaskDetailPanel task={found} onUpdated={reload} />);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">작업</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">프로젝트 작업을 관리합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewSwitcher value={view} onChange={setView} views={["KANBAN", "CALENDAR", "GANTT"]} />
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> 새 작업
          </Button>
        </div>
      </div>

      {view === "KANBAN" && (
        <KanbanBoard
          tasks={tasks}
          userMap={userMap}
          onStatusChange={(id, status) => useTaskStore.getState().moveTaskStatus(id, status)}
          onTaskClick={(t) =>
            openRightPanel(<TaskDetailPanel task={t} onUpdated={reload} />)
          }
        />
      )}
      {view === "GANTT" && (
        <div className="space-y-3">
          <GanttLegend />
          <GanttChart
            tasks={tasks}
            onTaskClick={(t) =>
              openRightPanel(<TaskDetailPanel task={t} onUpdated={reload} />)
            }
            onDateChange={(id, start, end) => {
              // 간트 차트에서 기간을 드래그하면 시작일/마감일을 저장
              useTaskStore.getState().updateTask(id, {
                startDate: fmtDate(start),
                endDate: fmtDate(end),
              });
            }}
            onProgressChange={(id, progress) => {
              // 바를 드래그해 진척도를 변경하면 저장
              useTaskStore.getState().updateTask(id, { progress });
            }}
          />
        </div>
      )}
      {view === "CALENDAR" && (
        <CalendarView
          tasks={tasks}
          onTaskClick={(t) =>
            openRightPanel(<TaskDetailPanel task={t} onUpdated={reload} />)
          }
        />
      )}
      {view === "FEED" && (
        <p className="text-sm text-slate-400">
          피드는 <a href="/feed" className="text-blue-600 hover:underline">피드 페이지</a>에서 확인하세요.
        </p>
      )}

      <TaskCreateModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={reload} />
    </div>
  );
}
