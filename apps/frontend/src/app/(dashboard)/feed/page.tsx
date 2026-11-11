"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { FeedCreateModal } from "@/components/feed/FeedCreateModal";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import type { FeedPost, FeedPostType, User } from "@/types";

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [filter, setFilter] = useState<FeedPostType | "ALL">("ALL");
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/feed");
      const data = res.data || [];
      setPosts(data);
      // use embedded author from API response
      const map: Record<string, User> = {};
      data.forEach((p: any) => {
        if (p.author) map[p.authorId] = p.author;
      });
      setUsers((prev) => ({ ...prev, ...map }));
    } catch {
      /* keep empty */
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter === "ALL" ? posts : posts.filter((p) => p.type === filter);

  const filters: { key: FeedPostType | "ALL"; label: string }[] = [
    { key: "ALL", label: "전체" },
    { key: "REQUEST", label: "요청" },
    { key: "TASK", label: "업무" },
    { key: "JOURNAL", label: "일지" },
    { key: "SHARE", label: "공유" },
    { key: "ANNOUNCEMENT", label: "공지" },
  ];

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">피드</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> 글 작성
        </Button>
      </div>

      <div className="flex gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${filter === f.key ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((p: any) => (
          <FeedPostCard key={p.id} post={p} author={users[p.authorId] || p.author} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">게시글이 없습니다.</p>
        )}
      </div>

      <FeedCreateModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={load} />
    </div>
  );
}
