"use client";

// FlowHub 지식 베이스 에디터 (Markdown WYSIWYG - textarea + 미리보기)

import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Eye, Edit3, List, History, Users, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { KnowledgeVisibility } from "@/types";

interface KnowledgeEditorProps {
  initialTitle?: string;
  initialContent?: string;
  visibility?: KnowledgeVisibility;
  onSave?: (title: string, content: string) => void;
  onPromote?: () => void;
}

interface TocItem {
  level: number;
  text: string;
  id: string;
}

function extractToc(md: string): TocItem[] {
  const lines = md.split("\n");
  const items: TocItem[] = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      const text = m[2].trim();
      const id = text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-가-힣]/g, "");
      items.push({ level, text, id });
    }
  }
  return items;
}

export function KnowledgeEditor({
  initialTitle = "",
  initialContent = "",
  visibility = "PERSONAL",
  onSave,
  onPromote,
}: KnowledgeEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<"edit" | "preview" | "split">("split");
  const [vis, setVis] = useState<KnowledgeVisibility>(visibility);

  const toc = useMemo(() => extractToc(content), [content]);

  const handleSave = () => {
    onSave?.(title, content);
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문서 제목"
            className="text-lg font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none"
          />
          <Badge color={vis === "PERSONAL" ? "bg-slate-100 text-slate-600" : "bg-green-100 text-green-700"}>
            {vis === "PERSONAL" ? "개인" : vis === "TEAM" ? "팀" : "공개"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => setMode("edit")}
              className={cn("rounded px-2.5 py-1 text-xs", mode === "edit" ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}
            >
              <Edit3 className="inline h-3.5 w-3.5 mr-1" />편집
            </button>
            <button
              onClick={() => setMode("preview")}
              className={cn("rounded px-2.5 py-1 text-xs", mode === "preview" ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}
            >
              <Eye className="inline h-3.5 w-3.5 mr-1" />미리보기
            </button>
            <button
              onClick={() => setMode("split")}
              className={cn("rounded px-2.5 py-1 text-xs", mode === "split" ? "bg-white shadow-sm text-slate-900" : "text-slate-500")}
            >
              분할
            </button>
          </div>
          {vis === "PERSONAL" && (
            <Button variant="secondary" size="sm" onClick={onPromote}>
              <Users className="h-3.5 w-3.5" /> 팀으로 승격
            </Button>
          )}
          <Button size="sm" onClick={handleSave}>
            <Save className="h-3.5 w-3.5" /> 저장
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* TOC sidebar */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50/50 p-3 lg:block">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-400">
            <List className="h-3.5 w-3.5" /> 목차
          </div>
          {toc.length === 0 ? (
            <p className="text-xs text-slate-400">제목(#)을 추가하면 목차가 생성됩니다.</p>
          ) : (
            <ul className="space-y-1">
              {toc.map((item, i) => (
                <li key={i} style={{ paddingLeft: (item.level - 1) * 12 }}>
                  <a href={`#${item.id}`} className="text-xs text-slate-600 hover:text-blue-600">
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-slate-200 pt-3">
            <button className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
              <History className="h-3.5 w-3.5" /> 버전 히스토리
            </button>
          </div>
        </aside>

        {/* Editor / Preview */}
        <div className="flex flex-1 overflow-hidden">
          {(mode === "edit" || mode === "split") && (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="마크다운으로 작성하세요... (# 제목, ## 소제목, - 목록, **굵게**)"
              className={cn(
                "flex-1 resize-none border-0 bg-white p-4 font-mono text-sm text-slate-800 focus:outline-none",
                mode === "split" && "border-r border-slate-200"
              )}
            />
          )}
          {(mode === "preview" || mode === "split") && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*미리보기*"}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
