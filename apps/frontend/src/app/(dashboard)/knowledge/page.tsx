"use client";

import React, { useEffect, useState, useRef } from "react";
import api from "@/lib/api";
import { KnowledgeEditor } from "@/components/knowledge/KnowledgeEditor";
import { Button } from "@/components/ui/Button";
import { BookOpen, Plus } from "lucide-react";
import type { KnowledgeArticle, KnowledgeVisibility } from "@/types";

export default function KnowledgePage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [selected, setSelected] = useState<KnowledgeArticle | null>(null);
  const [title, setTitle] = useState("새 문서");
  const [content, setContent] = useState("# 새 문서\n\n내용을 작성하세요.");
  const [visibility, setVisibility] = useState<KnowledgeVisibility>("PERSONAL");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/knowledge");
      setArticles(res.data || []);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ?article=<id> 진입 시 해당 문서 자동 선택 (검색 결과 딥링크)
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (deepLinkedRef.current) return;
    const id = new URLSearchParams(window.location.search).get("article");
    if (!id) return;
    const found = articles.find((a) => a.id === id);
    if (found) {
      deepLinkedRef.current = true;
      selectArticle(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles]);

  const selectArticle = (a: KnowledgeArticle) => {
    setSelected(a);
    setTitle(a.title);
    setContent(a.content);
    setVisibility(a.visibility);
  };

  const newArticle = () => {
    setSelected(null);
    setTitle("새 문서");
    setContent("# 새 문서\n\n내용을 작성하세요.");
    setVisibility("PERSONAL");
  };

  const save = async (t: string, c: string) => {
    setSaving(true);
    try {
      if (selected) {
        const res = await api.patch(`/knowledge/${selected.id}`, { title: t, content: c, visibility });
        setSelected(res.data);
        setTitle(res.data.title);
        setContent(res.data.content);
        setVisibility(res.data.visibility);
      } else {
        const res = await api.post("/knowledge", { title: t, content: c, visibility });
        setSelected(res.data);
        setTitle(res.data.title);
        setContent(res.data.content);
        setVisibility(res.data.visibility);
      }
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const promote = async () => {
    if (!selected) return;
    try {
      const res = await api.post(`/knowledge/${selected.id}/promote`);
      setSelected(res.data);
      setVisibility("TEAM");
      await load();
      alert("팀 지식 베이스로 승격되었습니다.");
    } catch (e: any) {
      alert(e?.response?.data?.message || "승격 실패");
    }
  };

  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">지식 베이스</h2>
          <Button size="sm" variant="ghost" onClick={newArticle}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {articles.map((a) => (
            <button
              key={a.id}
              onClick={() => selectArticle(a)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${selected?.id === a.id ? "bg-blue-50 text-blue-700" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"}`}
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{a.title}</span>
            </button>
          ))}
          {articles.length === 0 && <p className="text-xs text-slate-400">문서가 없습니다.</p>}
        </div>
      </aside>

      <div className="flex-1 p-4">
        <KnowledgeEditor
          key={selected?.id || "new"}
          initialTitle={title}
          initialContent={content}
          visibility={visibility}
          onSave={save}
          onPromote={promote}
        />
        {saving && <p className="mt-2 text-xs text-slate-400">저장 중...</p>}
      </div>
    </div>
  );
}
