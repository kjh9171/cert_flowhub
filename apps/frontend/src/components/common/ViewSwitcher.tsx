"use client";

// FlowHub 뷰 전환 탭

import React from "react";
import { cn } from "@/lib/utils";

export type ViewType = "FEED" | "KANBAN" | "CALENDAR" | "GANTT";

const views: { key: ViewType; label: string }[] = [
  { key: "FEED", label: "피드" },
  { key: "KANBAN", label: "칸반" },
  { key: "CALENDAR", label: "캘린더" },
  { key: "GANTT", label: "간트" },
];

interface ViewSwitcherProps {
  value: ViewType;
  onChange: (v: ViewType) => void;
  /** 표시할 탭 목록 (기본: 전체). 작업 화면처럼 피드가 의미 없는 경우 제한해서 사용 */
  views?: ViewType[];
}

export function ViewSwitcher({ value, onChange, views: enabled }: ViewSwitcherProps) {
  const active = views.filter((v) => !enabled || enabled.includes(v.key));
  return (
    <div className="inline-flex shrink-0 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 dark:border-slate-700 dark:bg-slate-800">
      {active.map((v) => (
        <button
          key={v.key}
          onClick={() => onChange(v.key)}
          className={cn(
            "shrink-0 whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition-colors",
            value === v.key
              ? "bg-blue-600 text-white"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
