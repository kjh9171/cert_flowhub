"use client";

// FlowHub 통합 월간 캘린더 운영 위젯
// - 발주(주황) / 일정(파랑·tasks) / 통화(초록·SMS) 3개 레이어를 토글하며 한눈에 조회

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import api from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { OrderNote, Task, SmsThread } from "@/types";

type Layer = "order" | "task" | "sms";

interface DayEvent {
  id: string;
  kind: Layer;
  label: string;
  sub?: string;
}

const kindStyle: Record<Layer, string> = {
  order: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  task: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  sms: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
};
const kindLabel: Record<Layer, string> = { order: "발주", task: "일정", sms: "통화" };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function IntegratedCalendar() {
  const [cursor, setCursor] = useState(() => new Date());
  const [orders, setOrders] = useState<OrderNote[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [threads, setThreads] = useState<SmsThread[]>([]);
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ order: true, task: true, sms: true });

  useEffect(() => {
    (async () => {
      const [o, t, s] = await Promise.allSettled([
        api.get("/orders"),
        api.get("/tasks"),
        api.get("/sms/threads"),
      ]);
      if (o.status === "fulfilled") setOrders(Array.isArray(o.value.data) ? o.value.data : []);
      if (t.status === "fulfilled") {
        const raw = Array.isArray(t.value.data) ? t.value.data : [];
        setTasks(
          raw.map((x: any) => ({
            ...x,
            startDate: x.startDate ? String(x.startDate).slice(0, 10) : undefined,
            endDate: x.endDate ? String(x.endDate).slice(0, 10) : undefined,
          }))
        );
      }
      if (s.status === "fulfilled") setThreads(Array.isArray(s.value.data) ? s.value.data : []);
    })();
  }, []);

  // 월간 그리드 계산
  const grid = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay()); // 일요일 시작
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [cursor]);

  // 날짜 → 이벤트 매핑 (multi-day tasks 확장)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    const add = (date: string, ev: DayEvent) => {
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(ev);
    };
    if (layers.order) {
      for (const o of orders) {
        if (!o.dueDate) continue;
        add(String(o.dueDate).slice(0, 10), {
          id: `o-${o.id}`,
          kind: "order",
          label: `발주 ${o.partnerName}`,
          sub: `${o.totalAmount.toLocaleString()}원`,
        });
      }
    }
    if (layers.task) {
      for (const t of tasks) {
        if (!t.startDate) continue;
        const from = new Date(t.startDate);
        const to = t.endDate ? new Date(t.endDate) : from;
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          add(fmt(d), { id: `t-${t.id}-${d.getTime()}`, kind: "task", label: t.title });
        }
      }
    }
    if (layers.sms) {
      for (const s of threads) {
        add(String(s.lastMessageAt).slice(0, 10), {
          id: `s-${s.id}`,
          kind: "sms",
          label: `통화 ${s.participantName || s.participantPhone}`,
        });
      }
    }
    return map;
  }, [orders, tasks, threads, layers]);

  const today = fmt(new Date());
  const monthLabel = `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;

  const toggle = (k: Layer) => setLayers((p) => ({ ...p, [k]: !p[k] }));

  return (
    <section className="rounded-lg border border-line bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-ink">통합 월간 캘린더</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-md p-1.5 text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="이전 달">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[110px] text-center text-sm font-medium text-ink">{monthLabel}</span>
            <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-md p-1.5 text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="다음 달">
              <ChevronRight className="h-4 w-4" />
            </button>
            <button onClick={() => setCursor(new Date())} className="rounded-md border border-line px-2 py-1 text-xs text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800">
              오늘
            </button>
          </div>
        </div>
        {/* 레이어 필터 */}
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="h-3.5 w-3.5 text-ink2" />
          {(["order", "task", "sms"] as Layer[]).map((k) => (
            <button
              key={k}
              onClick={() => toggle(k)}
              aria-pressed={layers[k]}
              className={cn(
                "rounded-full border px-2.5 py-1 font-medium transition-opacity",
                layers[k] ? kindStyle[k] : "border-line text-slate-400 line-through opacity-60"
              )}
            >
              {kindLabel[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto p-3">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1.5">{w}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((d) => {
              const key = fmt(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const events = eventsByDay.get(key) ?? [];
              const shown = events.slice(0, 3);
              const more = events.length - shown.length;
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[86px] rounded-md border border-line bg-canvas p-1.5",
                    !inMonth && "opacity-40",
                    key === today && "ring-2 ring-blue-500"
                  )}
                >
                  <div className={cn("mb-1 text-[11px] font-semibold", key === today ? "text-blue-600 dark:text-blue-400" : "text-ink2")}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {shown.map((ev) => (
                      <div key={ev.id} title={ev.sub ? `${ev.label} · ${ev.sub}` : ev.label} className={cn("truncate rounded border px-1 py-0.5 text-[10px] leading-tight", kindStyle[ev.kind])}>
                        {ev.label}
                      </div>
                    ))}
                    {more > 0 && <div className="px-1 text-[10px] text-ink2">+{more}개 더</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
