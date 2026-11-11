"use client";

import React, { useEffect, useState, useRef } from "react";
import { Search, X, FileText, CheckSquare, MessageSquare, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import api from "@/lib/api";

interface SearchResult {
  id: string;
  type: "task" | "document" | "feed" | "file";
  title: string;
  snippet: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "task" | "document" | "feed">("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get("/search", { params: { q: query } });
        const data = res.data || {};
        const mapped: SearchResult[] = [
          ...(data.tasks || []).map((t: any) => ({ id: t.id, type: "task" as const, title: t.title, snippet: t.status })),
          ...(data.articles || []).map((a: any) => ({ id: a.id, type: "document" as const, title: a.title, snippet: a.category || a.visibility })),
          ...(data.posts || []).map((p: any) => ({ id: p.id, type: "feed" as const, title: p.title || "피드", snippet: p.type })),
        ];
        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  const filtered = tab === "all" ? results : results.filter((r) => r.type === tab);

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

  const tabs: { key: "all" | "task" | "document" | "feed"; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "task", label: "작업" },
    { key: "document", label: "문서" },
    { key: "feed", label: "피드" },
  ];

  return (
    <Modal open={open} onClose={onClose} width="max-w-2xl">
      <div className="-m-5">
        <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="작업, 문서, 피드 검색..."
            className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500 dark:text-slate-400"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium",
                tab === t.key ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">검색 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              {query ? "검색 결과가 없습니다." : "검색어를 입력하세요."}
            </div>
          ) : (
            filtered.map((r) => {
              const Icon = typeIcon[r.type];
              return (
                <button
                  key={r.id}
                  onClick={onClose}
                  className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{r.title}</span>
                      <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
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
          검색어 입력 시 자동 검색 · Esc 닫기
        </div>
      </div>
    </Modal>
  );
}
