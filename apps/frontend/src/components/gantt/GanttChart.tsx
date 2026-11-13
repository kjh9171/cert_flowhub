"use client";

// FlowHub 간트 차트 (gantt-task-react)

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import "gantt-task-react/dist/index.css";
import { ViewMode } from "gantt-task-react";
import { cn, priorityColor } from "@/lib/utils";
import type { Task as AppTask } from "@/types";

// SSR 비활성화 (gantt-task-react는 client-only)
const Gantt = dynamic(() => import("gantt-task-react").then((m) => m.Gantt), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-slate-400">
      간트 차트 로딩 중...
    </div>
  ),
});

interface GanttChartProps {
  tasks: AppTask[];
  onTaskClick?: (task: AppTask) => void;
  /** 바를 드래그해 기간을 수정했을 때 (시작일/마감일 저장) */
  onDateChange?: (id: string, start: Date, end: Date) => void;
  /** 바 끝단을 드래그해 진척도를 변경했을 때 */
  onProgressChange?: (id: string, progress: number) => void;
}

function toGanttTasks(tasks: AppTask[]) {
  const list: any[] = [];
  for (const t of tasks) {
    if (!t.startDate || !t.endDate) continue;
    const start = new Date(t.startDate);
    const end = new Date(t.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
    if (end < start) continue;
    list.push({
      id: t.id,
      name: t.title,
      start,
      end,
      progress: Math.min(100, Math.max(0, t.progress || 0)),
      type: "task",
      isDisabled: false,
      styles: {
        backgroundColor: priorityColor[t.priority],
        backgroundSelectedColor: priorityColor[t.priority],
        progressColor: "rgba(255,255,255,0.35)",
        progressSelectedColor: "rgba(255,255,255,0.35)",
      },
      dependencies: t.dependencyIds || [],
    });
  }
  return list;
}

export function GanttChart({ tasks, onTaskClick, onDateChange, onProgressChange }: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const ganttTasks = useMemo(() => toGanttTasks(tasks), [tasks]);

  if (ganttTasks.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white dark:bg-slate-900 text-sm text-slate-400">
        <p>표시할 작업이 없습니다.</p>
        <p className="text-xs text-slate-300">시작일과 마감일이 있는 작업을 추가하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          총 {ganttTasks.length}개 작업
        </div>
        <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
          {[
            { key: ViewMode.Day, label: "일" },
            { key: ViewMode.Week, label: "주" },
            { key: ViewMode.Month, label: "월" },
          ].map((v) => (
            <button
              key={v.label}
              onClick={() => setViewMode(v.key)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === v.key ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <Gantt
          tasks={ganttTasks}
          viewMode={viewMode}
          onDateChange={(task: any) => {
            // 기간 드래그 수정 → task 객체에 시작일/마감일이 이미 반영됨 (0.3.x API)
            onDateChange?.(task.id, task.start, task.end);
          }}
          onProgressChange={(task: any) => {
            // 바 끝단 드래그 → 진척도 반영 (task.progress: 0~1 또는 0~100)
            const p = task.progress;
            onProgressChange?.(task.id, Math.round(p <= 1 ? p * 100 : p));
          }}
          onDoubleClick={(task: any) => {
            const found = tasks.find((t) => t.id === task.id);
            if (found) onTaskClick?.(found);
          }}
          onClick={(task: any) => {
            const found = tasks.find((t) => t.id === task.id);
            if (found) onTaskClick?.(found);
          }}
          listCellWidth="260px"
          columnWidth={viewMode === ViewMode.Month ? 160 : viewMode === ViewMode.Week ? 100 : 56}
          rowHeight={52}
          fontSize="12"
          barCornerRadius={4}
          barBackgroundColor="#2563EB"
          barBackgroundSelectedColor="#1D4ED8"
        />
      </div>
    </div>
  );
}

export function GanttLegend() {
  const items = [
    { color: "#DC2626", label: "긴급" },
    { color: "#D97706", label: "높음" },
    { color: "#2563EB", label: "보통" },
    { color: "#64748B", label: "낮음" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
      <span className="ml-2 text-slate-400">· 바를 클릭하면 상세 패널이 열립니다.</span>
    </div>
  );
}
