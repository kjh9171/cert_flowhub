"use client";

// FlowHub 글로벌 검색 (Cmd+K)

import React, { useEffect, useState, useRef } from "react";
import { Search, X, FileText, CheckSquare, MessageSquare, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

interface SearchResult {
  id: string;
  type: "task" | "document" | "feed" | "file";
  title: string;
  snippet: string;
}

const mockResults: SearchResult[] = [
  { id: "1", type: "task", title: "로그인 페이지 UI 구현", snippet: "Next.js App Router 기반 로그인 화면" },
  { id: "2", type: "document", title: "FlowHub 아키텍처 가이드", snippet: "시스템 구조 및 디렉토리 설계" },
  { id: "3", type: "feed", title: "프로젝트 킥오프 공지", snippet: "FlowHub 개발 시작합니다" },
  { id: "4", type: "file", title: "schema.prisma", snippet: "Prisma 스키마 정의 파일" },
];

const typeIcon: Record<SearchResult["type"], React.ComponentType<{ className?: string }>> = {
  task: CheckSquare,
  document: FileText,
  feed: MessageSquare,
  file: File,
};

const typeLabel: Record<SearchResult["type"], string> = {
  task: "작업",
  document: "문서",
  feed: "피드",
  file: "파일",
};

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | SearchResult["type"]>("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const filtered = mockResults.filter((r) => {
    if (tab !== "all" && r.type !== tab) return false;
    if (!query) return true;
    return r.title.toLowerCase().includes(query.toLowerCase()) || r.snippet.toLowerCase().includes(query.toLowerCase());
  });

  const tabs: { key: "all" | SearchResult["type"]; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "task", label: "작업" },
    { key: "document", label: "문서" },
    { key: "feed", label: "피드" },
    { key: "file", label: "파일" },
  ];

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl">
      <div className="-m-5">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="작업, 문서, 피드, 파일 검색..."
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-4 py-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium",
                tab === t.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">검색 결과가 없습니다.</div>
          ) : (
            filtered.map((r) => {
              const Icon = typeIcon[r.type];
              return (
                <button
                  key={r.id}
                  onClick={onClose}
                  className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-slate-50"
                >
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900">{r.title}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {typeLabel[r.type]}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-400">{r.snippet}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
          ↑↓ 이동 · Enter 선택 · Esc 닫기
        </div>
      </div>
    </Modal>
  );
}
