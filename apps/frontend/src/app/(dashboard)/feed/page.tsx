"use client";

import React, { useState } from "react";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import type { FeedPost, FeedPostType, User } from "@/types";

const mockUsers: Record<string, User> = {
  u1: { id: "u1", name: "홍길동", email: "hong@flowhub.local", role: "ADMIN", status: "ONLINE" },
  u2: { id: "u2", name: "김철수", email: "kim@flowhub.local", role: "MEMBER", status: "BUSY" },
};

const initialPosts: FeedPost[] = [
  { id: "fp1", workspaceId: "w1", authorId: "u1", type: "ANNOUNCEMENT", title: "FlowHub 개발 킥오프", content: "## 환영합니다\nFlowHub 개발을 시작합니다.", isPinned: true, createdAt: "2026-11-10T09:00:00Z" },
  { id: "fp2", workspaceId: "w1", projectId: "p1", authorId: "u2", type: "SHARE", content: "Prisma 스키마 초안 공유합니다.", isPinned: false, createdAt: "2026-11-09T14:30:00Z" },
  { id: "fp3", workspaceId: "w1", authorId: "u1", type: "JOURNAL", content: "오늘 작업: 간트 차트 컴포넌트 구현 완료.", isPinned: false, createdAt: "2026-11-08T18:00:00Z" },
];

export default function FeedPage() {
  const [posts] = useState(initialPosts);
  const [filter, setFilter] = useState<FeedPostType | "ALL">("ALL");

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
        <h1 className="text-2xl font-bold text-slate-900">피드</h1>
        <Button size="sm">
          <Plus className="h-4 w-4" /> 글 작성
        </Button>
      </div>

      <div className="flex gap-1 rounded-md border border-slate-200 bg-white p-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${filter === f.key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((p) => (
          <FeedPostCard key={p.id} post={p} author={mockUsers[p.authorId]} />
        ))}
      </div>
    </div>
  );
}
