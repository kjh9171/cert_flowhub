"use client";

// FlowHub 캘린더 뷰

import React, { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, priorityColor } from "@/lib/utils";
import type { Task } from "@/types";

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [current, setCurrent] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(current), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(current), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [current]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.startDate) continue;
      const d = new Date(t.startDate);
      const key = format(d, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tasks]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          {format(current, "yyyy년 M월", { locale: ko })}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrent((c) => subMonths(c, 1))}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrent(new Date())}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            오늘
          </button>
          <button
            onClick={() => setCurrent((c) => addMonths(c, 1))}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-md bg-slate-200 overflow-hidden">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="bg-slate-50 py-2 text-center text-xs font-medium text-slate-500">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) || [];
          const inMonth = isSameMonth(day, current);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={key}
              className={cn(
                "min-h-[90px] bg-white p-1.5",
                !inMonth && "bg-slate-50/50 text-slate-300"
              )}
            >
              <div
                className={cn(
                  "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday && "bg-blue-600 text-white font-bold",
                  !isToday && inMonth && "text-slate-700",
                  !inMonth && "text-slate-300"
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTaskClick?.(t)}
                    className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] text-white"
                    style={{ backgroundColor: priorityColor[t.priority] }}
                    title={t.title}
                  >
                    {t.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{dayTasks.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
