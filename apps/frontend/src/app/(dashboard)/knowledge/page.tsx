"use client";

import React, { useState } from "react";
import { KnowledgeEditor } from "@/components/knowledge/KnowledgeEditor";
import { Button } from "@/components/ui/Button";
import { BookOpen, Plus } from "lucide-react";

const mockArticles = [
  { id: "a1", title: "FlowHub 아키텍처 가이드", visibility: "TEAM" as const },
  { id: "a2", title: "Prisma 스키마 설계 노트", visibility: "PERSONAL" as const },
  { id: "a3", title: "Socket.io 이벤트 규약", visibility: "TEAM" as const },
];

export default function KnowledgePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("# 새 문서\n\n내용을 작성하세요.");

  return (
    <div className="flex h-full">
      {/* Sidebar list */}
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">지식 베이스</h2>
          <Button size="sm" variant="ghost">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {mockArticles.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a.id)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${selected === a.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{a.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Editor */}
      <div className="flex-1 p-4">
        <KnowledgeEditor
          initialTitle="새 문서"
          initialContent={content}
          visibility="PERSONAL"
          onSave={(t, c) => setContent(c)}
          onPromote={() => alert("팀 지식 베이스로 승격되었습니다.")}
        />
      </div>
    </div>
  );
}
