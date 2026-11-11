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
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
      {views.map((v) => (
        <button
          key={v.key}
          onClick={() => onChange(v.key)}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-medium transition-colors",
            value === v.key
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
