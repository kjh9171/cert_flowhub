"use client";

// FlowHub 간트 차트 (gantt-task-react)

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { cn, priorityColor, taskStatusLabel } from "@/lib/utils";
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
  onTaskChange?: (task: AppTask) => void;
  onTaskClick?: (task: AppTask) => void;
}

function toGanttTasks(tasks: AppTask[]) {
  const list: any[] = [];
  for (const t of tasks) {
    if (!t.startDate || !t.endDate) continue;
    list.push({
      id: t.id,
      name: t.title,
      start: new Date(t.startDate),
      end: new Date(t.endDate),
      progress: t.progress,
      type: "task",
      isDisabled: false,
      styles: {
        backgroundColor: priorityColor[t.priority],
        backgroundSelectedColor: priorityColor[t.priority],
        progressColor: "#ffffff55",
        progressSelectedColor: "#ffffff55",
      },
      dependencies: t.dependencyIds,
    });
  }
  return list;
}

export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  const ganttTasks = useMemo(() => toGanttTasks(tasks), [tasks]);

  if (ganttTasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
        표시할 작업이 없습니다.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <Gantt
        tasks={ganttTasks}
        viewMode={"Day" as any}
        onDateChange={() => {}}
        onProgressChange={() => {}}
        onDoubleClick={(task: any) => {
          const found = tasks.find((t) => t.id === task.id);
          if (found) onTaskClick?.(found);
        }}
        listCellWidth="200px"
        columnWidth={40}
        ganttHeight={400}
        barBackgroundColor="#2563EB"
      />
    </div>
  );
}

// 간트 필터/범례 컴포넌트
export function GanttLegend() {
  const items = [
    { color: "#DC2626", label: "긴급" },
    { color: "#D97706", label: "높음" },
    { color: "#2563EB", label: "보통" },
    { color: "#64748B", label: "낮음" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
      <span className="ml-2 text-slate-400">|</span>
      <span className="text-slate-400">상태: {Object.keys(taskStatusLabel).length}종</span>
    </div>
  );
}
