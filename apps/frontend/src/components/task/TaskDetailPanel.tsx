"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { priorityColor, priorityLabel, taskStatusLabel } from "@/lib/utils";
import type { Task, TaskStatus, TaskPriority } from "@/types";

interface TaskDetailPanelProps {
  task: Task;
  onUpdated?: () => void;
}

export function TaskDetailPanel({ task, onUpdated }: TaskDetailPanelProps) {
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [progress, setProgress] = useState(task.progress);
  const [title, setTitle] = useState(task.title);
  const [content, setContent] = useState(task.content || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setStatus(task.status);
    setPriority(task.priority);
    setProgress(task.progress);
    setTitle(task.title);
    setContent(task.content || "");
  }, [task]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api.patch(`/tasks/${task.id}`, { title, content, status, priority, progress });
      setMsg("저장되었습니다.");
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
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[100px] w-full rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">상태</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="h-9 rounded-md border border-slate-200 dark:border-slate-800 px-3 text-sm">
            {Object.entries(taskStatusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">우선순위</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="h-9 rounded-md border border-slate-200 dark:border-slate-800 px-3 text-sm">
            {Object.entries(priorityLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">진척도: {progress}%</label>
        <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full" />
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
