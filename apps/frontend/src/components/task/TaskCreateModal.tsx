"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  const [projects, setProjects] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [p, w] = await Promise.all([api.get("/projects"), api.get("/workspaces")]);
        setProjects(p.data || []);
        setWorkspaces(w.data || []);
        if (w.data?.[0]) setWorkspaceId(w.data[0].id);
        if (p.data?.[0]) setProjectId(p.data[0].id);
      } catch {
        /* ignore */
      }
    })();
  }, [open]);

  const reset = () => {
    setTitle(""); setContent(""); setPriority("MEDIUM"); setStatus("REQUESTED");
    setStartDate(""); setEndDate(""); setProgress(0); setError("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("제목은 필수입니다."); return; }
    if (!workspaceId && !projectId) { setError("워크스페이스/프로젝트가 필요합니다."); return; }
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
          <label className="text-xs font-medium text-slate-600">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[80px] rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">워크스페이스</label>
            <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className="h-9 rounded-md border border-slate-200 px-3 text-sm">
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">프로젝트</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-9 rounded-md border border-slate-200 px-3 text-sm">
              <option value="">(없음)</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">우선순위</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="h-9 rounded-md border border-slate-200 px-3 text-sm">
              <option value="URGENT">긴급</option>
              <option value="HIGH">높음</option>
              <option value="MEDIUM">보통</option>
              <option value="LOW">낮음</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className="h-9 rounded-md border border-slate-200 px-3 text-sm">
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
