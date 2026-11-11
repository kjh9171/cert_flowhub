"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import type { Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [p, w] = await Promise.all([api.get("/projects"), api.get("/workspaces")]);
        setProjects(p.data || []);
        setWorkspaces(w.data || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const createProject = async () => {
    const name = prompt("프로젝트 이름");
    if (!name) return;
    const wsId = workspaces[0]?.id;
    if (!wsId) {
      alert("워크스페이스가 없습니다. 먼저 가입하세요.");
      return;
    }
    try {
      const res = await api.post("/projects", { workspaceId: wsId, name, color: "#2563EB" });
      setProjects((prev) => [res.data, ...prev]);
    } catch (e: any) {
      alert(e?.response?.data?.message || "생성 실패");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">프로젝트</h1>
        <Button size="sm" onClick={createProject}>
          <Plus className="h-4 w-4" /> 새 프로젝트
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <div key={p.id} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: p.color || "#2563EB" }} />
              <p className="font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{p.description || "설명 없음"}</p>
          </div>
        ))}
        {projects.length === 0 && <p className="text-sm text-slate-400">프로젝트가 없습니다.</p>}
      </div>
    </div>
  );
}
