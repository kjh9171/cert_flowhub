"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { FeedPostType } from "@/types";

interface FeedCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function FeedCreateModal({ open, onClose, onCreated }: FeedCreateModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<FeedPostType>("SHARE");
  const [workspaceId, setWorkspaceId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [w, p] = await Promise.all([api.get("/workspaces"), api.get("/projects")]);
        setWorkspaces(w.data || []);
        setProjects(p.data || []);
        if (w.data?.[0]) setWorkspaceId(w.data[0].id);
      } catch {
        /* ignore */
      }
    })();
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) { setError("내용은 필수입니다."); return; }
    if (!workspaceId) { setError("워크스페이스가 필요합니다."); return; }
    setSaving(true);
    setError("");
    try {
      let finalContent = content;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
        finalContent += `\\n\\n[첨부파일: ${up.data.fileName}](${up.data.fileUrl})`;
      }
      await api.post("/feed", { workspaceId, projectId: projectId || undefined, type, title: title || undefined, content: finalContent });
      setTitle(""); setContent(""); setType("SHARE"); setFile(null);
      onCreated?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || "작성 실패");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="글 작성">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">유형</label>
          <select value={type} onChange={(e) => setType(e.target.value as FeedPostType)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            <option value="REQUEST">요청</option>
            <option value="TASK">업무</option>
            <option value="JOURNAL">일지</option>
            <option value="SHARE">공유</option>
            <option value="ANNOUNCEMENT">공지</option>
          </select>
        </div>
        <Input label="제목 (선택)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">내용 (Markdown)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            required
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
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">프로젝트 (선택)</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
              <option value="">(없음)</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">첨부 파일 (선택)</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-sm text-slate-600 dark:text-slate-400"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>취소</Button>
          <Button type="submit" disabled={saving}>{saving ? "작성 중..." : "작성"}</Button>
        </div>
      </form>
    </Modal>
  );
}
