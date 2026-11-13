"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types";

interface TaskCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function TaskCreateModal({ open, onClose, onCreated }: TaskCreateModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("REQUESTED");
  const [projectId, setProjectId] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [progress, setProgress] = useState(0);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]); // 담당자 지정
  const [projects, setProjects] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [p, w, u] = await Promise.all([
          api.get("/projects"),
          api.get("/workspaces"),
          api.get("/users"),
        ]);
        setProjects(p.data || []);
        setWorkspaces(w.data || []);
        setUsers((u.data || []).map((x: any) => ({ id: x.id, name: x.name })));
        if (w.data?.[0]) setWorkspaceId(w.data[0].id);
        if (p.data?.[0]) setProjectId(p.data[0].id);
      } catch {
        /* ignore */
      }
    })();
  }, [open]);

  const toggleAssignee = (id: string) => {
    setAssigneeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const reset = () => {
    setTitle(""); setContent(""); setPriority("MEDIUM"); setStatus("REQUESTED");
    setStartDate(""); setEndDate(""); setProgress(0); setError("");
    setAssigneeIds([]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("제목은 필수입니다."); return; }
    setSaving(true);
    setError("");
    try {
      await api.post("/tasks", {
        workspaceId: workspaceId || undefined,
        projectId: projectId || undefined,
        title,
        content,
        priority,
        status,
        progress,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        assigneeIds, // 담당자 배분 (해당자에게 알림 발송)
      });
      reset();
      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "생성 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="새 작업">
      <form onSubmit={submit} className="space-y-3">
        <Input label="제목" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">워크스페이스</label>
            <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">프로젝트</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <option value="">(없음)</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">우선순위</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <option value="URGENT">긴급</option>
              <option value="HIGH">높음</option>
              <option value="MEDIUM">보통</option>
              <option value="LOW">낮음</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <option value="REQUESTED">요청</option>
              <option value="IN_PROGRESS">진행</option>
              <option value="PAUSED">일시정지</option>
              <option value="DONE">완료</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="시작일" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="마감일" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        {/* 담당자 배분 (체크박스) - 지정 시 알림 발송 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            담당자 {assigneeIds.length > 0 && <span className="text-blue-600">({assigneeIds.length}명 지정)</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => (
              <label
                key={u.id}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors",
                  assigneeIds.includes(u.id)
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50"
                )}
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-blue-600"
                  checked={assigneeIds.includes(u.id)}
                  onChange={() => toggleAssignee(u.id)}
                />
                {u.name}
              </label>
            ))}
          </div>
        </div>
        <Input label="진척도 (%)" type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={saving}>{saving ? "생성 중..." : "생성"}</Button>
        </div>
      </form>
    </Modal>
  );
}
