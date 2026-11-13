"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IntegrationBadge } from "@/components/badge/IntegrationBadge";
import { priorityColor, priorityLabel, taskStatusLabel } from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority } from "@/types";

interface TaskDetailPanelProps {
  task: Task;
  onUpdated?: () => void;
}

/** 작업 상세 패널 - 상태/우선순위/진척도/담당자/날짜 수정 + 연동 Badge 표시 */
export function TaskDetailPanel({ task, onUpdated }: TaskDetailPanelProps) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [progress, setProgress] = useState(task.progress);
  const [title, setTitle] = useState(task.title);
  const [content, setContent] = useState(task.content || "");
  const [startDate, setStartDate] = useState((task.startDate || "").slice(0, 10));
  const [endDate, setEndDate] = useState((task.endDate || "").slice(0, 10));
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assigneeIds || []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // 작업 본문의 연동 Badge 목록 (REST)
  const [badges, setBadges] = useState<any[]>([]);

  // 종속성 (Dependency) 관리용: 이 작업이 "기대하는" 전제 작업 목록
  const [deps, setDeps] = useState<Array<{ id: string; dependsOnTaskId: string; type?: string; title?: string }>>([]);
  // 의존 대상으로 선택할 수 있는 다른 작업 목록 (본인 제외)
  const [otherTasks, setOtherTasks] = useState<Array<{ id: string; title: string }>>([]);
  const [depTarget, setDepTarget] = useState("");

  // 워크스페이스 인원 (담당자 선택용)
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    setStatus(task.status);
    setPriority(task.priority);
    setProgress(task.progress);
    setTitle(task.title);
    setContent(task.content || "");
    setStartDate((task.startDate || "").slice(0, 10));
    setEndDate((task.endDate || "").slice(0, 10));
    setAssigneeIds(task.assigneeIds || []);

    // 작업에 연결된 연동 Badge / 종속성 / 워크스페이스 인원 로드 (GET /tasks/:id)
    (async () => {
      try {
        const t = await api.get(`/tasks/${task.id}`);
        setBadges(t.data?.badges || []);
        // 종속성 목록 매핑: dependsOnTask(전제 작업) 제목 포함
        setDeps((t.data?.dependencies || []).map((d: any) => ({
          id: d.id,
          dependsOnTaskId: d.dependsOnTaskId,
          type: d.type,
          title: d.dependsOnTask?.title || "#" + d.dependsOnTaskId,
        })));
      } catch { /* API 미실행 시 무시 */ }
      try {
        const u = await api.get("/users");
        setUsers((u.data || []).map((x: any) => ({ id: x.id, name: x.name })));
      } catch { /* ignore */ }
      try {
        // 의존 대상 선택 목록: 전체 작업에서 본인을 제외
        const t2 = await api.get("/tasks");
        setOtherTasks((t2.data || []).filter((x: any) => x.id !== task.id).map((x: any) => ({ id: x.id, title: x.title })));
      } catch { /* ignore */ }
    })();
  }, [task]);

  // 종속성 추가 (간트 차트의 화살표로 표시됨)
  const addDependency = async () => {
    if (!depTarget) return;
    try {
      await api.post(`/tasks/${task.id}/dependencies`, { dependsOnTaskId: depTarget, type: "FS" });
      setDepTarget("");
      onUpdated?.(); // 간트 화살표 갱신 (의존성 변경 → 저장)
    } catch { /* ignore */ }
  };

  // 종속성 삭제
  const removeDependency = async (depId: string) => {
    try {
      await api.delete(`/tasks/${task.id}/dependencies/${depId}`);
      onUpdated?.();
    } catch { /* ignore */ }
  };

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api.patch(`/tasks/${task.id}`, {
        title,
        content,
        status,
        priority,
        progress,
        startDate: startDate || null,
        endDate: endDate || null,
        assigneeIds, // 담당자 재배분 (변경 시 알림 발생)
      });
      setMsg("저장되었습니다. 실시간으로 다른 참여자에게 전달됩니다.");
      onUpdated?.();
    } catch (e: any) {
      setMsg(e?.response?.data?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priorityColor[priority] }} />
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">내용</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">상태</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {Object.entries(taskStatusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">우선순위</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {Object.entries(priorityLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input label="시작일" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <Input label="마감일" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">진척도: {progress}%</label>
        <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full" />
      </div>

      {/* 종속성 (Dependency) 관리 — 간트 차트 화살표로 시각화 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">종속성 (전제 작업)</label>
        {deps.length === 0 ? (
          <p className="text-xs text-slate-400">종속성이 없습니다. 아래에서 전제 작업을 연결하세요.</p>
        ) : (
          <ul className="space-y-1">
            {deps.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-md border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs">
                <span className="truncate text-slate-600 dark:text-slate-400">→ {d.title} 완료 후 시작</span>
                <button onClick={() => removeDependency(d.id)} className="text-red-500 hover:text-red-700">삭제</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-1.5">
          <select value={depTarget} onChange={(e) => setDepTarget(e.target.value)} className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <option value="">전제 작업 선택...</option>
            {otherTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <Button onClick={addDependency} disabled={!depTarget} variant="secondary" size="sm">추가</Button>
        </div>
      </div>

      {/* 담당자 배분 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">담당자</label>
        <div className="flex flex-wrap gap-1.5">
          {users.map((u) => (
            <label
              key={u.id}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                assigneeIds.includes(u.id) ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              <input type="checkbox" className="h-3 w-3 accent-blue-600" checked={assigneeIds.includes(u.id)} onChange={() => toggleAssignee(u.id)} />
              {u.name}
            </label>
          ))}
        </div>
      </div>

      {/* 연동 상태 Badge (GitHub/CI/CD/API) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">연동 상태</label>
        {badges.length === 0 ? (
          <p className="text-xs text-slate-400">연결된 연동 이력이 없습니다.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b: any, i: number) => (
              <IntegrationBadge key={i} badge={b} size="sm" />
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-slate-400">
        생성: {task.createdAt} · 수정: {task.updatedAt}
      </div>

      {msg && <p className="text-sm text-slate-500 dark:text-slate-400">{msg}</p>}
      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "저장 중..." : "저장"}
      </Button>
    </div>
  );
}
