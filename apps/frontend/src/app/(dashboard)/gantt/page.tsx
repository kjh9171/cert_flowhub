"use client";

// FlowHub 간트 차트 페이지
// - 개인 일정 / 팀 프로젝트 레이어 필터 (spec A-1: 중첩 조회)
// - 바 드래그 → 기간 수정 저장 (onDateChange), 바 끝단 드래그 → 진척도 (onProgressChange)
// - 의존성 화살표는 gantt-task-react가 dependencyIds 기반으로 자동 렌더링

import React, { useEffect, useMemo, useState } from "react";
import { CalendarRange, Layers } from "lucide-react";
import api from "@/lib/api";
import { useTaskStore } from "@/stores/taskStore";
import { useUserStore } from "@/stores/userStore";
import { GanttChart, GanttLegend } from "@/components/gantt/GanttChart";
import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";
import { useLayoutStore } from "@/stores/layoutStore";
import { cn } from "@/lib/utils";

type Scope = "mine" | "team"; // 개인 일정 레이어 / 팀 프로젝트 레이어

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (백엔드 startDate/endDate 형식)
}

export default function GanttPage() {
  const { tasks, loadTasks, updateTask, subscribeSocket } = useTaskStore();
  const currentUser = useUserStore((s) => s.currentUser);
  const { openRightPanel } = useLayoutStore(); // 작업 상세 패널 (우측 사이드)

  // 레이어 필터 상태: 개인 일정 vs 전체 팀 작업, 프로젝트 선택
  const [scope, setScope] = useState<Scope>("team");
  const [projectId, setProjectId] = useState<string | "">(""); // "" = 전체 프로젝트
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  // 프로젝트 목록 로드 (레이어 필터 UI용)
  useEffect(() => {
    api.get("/projects").then((res) => setProjects(res.data || [])).catch(() => {});
  }, []);

  // 범위 변경 시 작업 목록 재로드 (백엔드 필터: assigneeId / projectId)
  useEffect(() => {
    loadTasks({
      ...(scope === "mine" && currentUser ? { assigneeId: currentUser.id } : {}),
      ...(projectId ? { projectId } : {}),
    });
  }, [loadTasks, scope, projectId, currentUser]);

  // 실시간 소켓 연동 (다른 사용자의 작업 수정 → 자동으로 갱신)
  useEffect(() => {
    const unsub = subscribeSocket();
    return unsub;
  }, [subscribeSocket]);

  // 현재 레이어 필터(개인/팀 + 프로젝트)를 유지한 채 재로드 — 상세 패널 저장 후 갱신용
  const reload = () => {
    loadTasks({
      ...(scope === "mine" && currentUser ? { assigneeId: currentUser.id } : {}),
      ...(projectId ? { projectId } : {}),
    });
  };

  // 필터링된 작업 수 (개인 일정 vs 팀 프로젝트 중첩 레이어)
  const visibleCount = useMemo(() => tasks.length, [tasks]);

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-2xl font-bold text-slate-900">간트 차트</h1>

      {/* 레이어 필터: 개인 일정 / 팀 프로젝트 중첩 조회 + 프로젝트 선택 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
          <button
            onClick={() => setScope("mine")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
              scope === "mine" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Layers className="h-4 w-4" />
            내 일정
          </button>
          <button
            onClick={() => setScope("team")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
              scope === "team" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            팀 프로젝트
          </button>
        </div>

        {/* 프로젝트 선택 (전체 vs 개별) */}
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="">전체 프로젝트</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <CalendarRange className="h-3.5 w-3.5" />
          {visibleCount}개 작업 표시 중 · 바를 드래그하면 기간이 수정됩니다
        </span>
      </div>

      <GanttLegend />

      <GanttChart
        tasks={tasks}
        onTaskClick={(t) => {
          // 상세 패널을 우측 사이드에 표시 (진척도/담당자/의존성 편집 지원)
          openRightPanel(<TaskDetailPanel task={t} onUpdated={reload} />);
        }}
        onDateChange={(id, start, end) => {
          // 기간 드래그 수정 → 서버 저장 (낙관적 갱신 + socket 브로드캐스트)
          updateTask(id, { startDate: toISODate(start), endDate: toISODate(end) });
        }}
        onProgressChange={(id, progress) => {
          // 바 끝단 드래그 → 진척도 저장
          updateTask(id, { progress });
        }}
      />
    </div>
  );
}
