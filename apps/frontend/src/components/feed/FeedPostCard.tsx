"use client";

// FlowHub 피드 게시글 카드

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MessageSquare, Share2, MoreHorizontal, Paperclip, Heart } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { FeedPost, FeedPostType, User } from "@/types";

const typeLabel: Record<FeedPostType, string> = {
  REQUEST: "요청",
  TASK: "업무",
  JOURNAL: "일지",
  SHARE: "공유",
  ANNOUNCEMENT: "공지",
};

const typeColor: Record<FeedPostType, string> = {
  REQUEST: "bg-amber-100 text-amber-700",
  TASK: "bg-blue-100 text-blue-700",
  JOURNAL: "bg-purple-100 text-purple-700",
  SHARE: "bg-green-100 text-green-700",
  ANNOUNCEMENT: "bg-red-100 text-red-700",
};

interface FeedPostCardProps {
  post: FeedPost;
  author?: User;
  onComment?: (postId: string) => void;
}

export function FeedPostCard({ post, author, onComment }: FeedPostCardProps) {
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={author?.name || "사용자"} src={author?.avatarUrl} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {author?.name || "익명"}
              </span>
              <Badge color={typeColor[post.type]}>{typeLabel[post.type]}</Badge>
              {post.isPinned && (
                <Badge color="bg-red-100 text-red-700">📌 고정</Badge>
              )}
            </div>
            <span className="text-xs text-slate-400">{formatDate(post.createdAt)}</span>
          </div>
        </div>
        <button className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Title */}
      {post.title && (
        <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">{post.title}</h3>
      )}

      {/* Content (Markdown) */}
      <div className="prose prose-sm max-w-none text-slate-700">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </div>

      {/* Attachments placeholder */}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <Paperclip className="h-3.5 w-3.5" />
        첨부파일 0개
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
        <button
          onClick={() => setLiked((l) => !l)}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-colors",
            liked ? "text-red-500" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} />
          {liked ? 1 : 0}
        </button>
        <button
          onClick={() => {
            setShowComments((s) => !s);
            onComment?.(post.id);
          }}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <MessageSquare className="h-4 w-4" />
          댓글
        </button>
        <button className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <Share2 className="h-4 w-4" />
          공유
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <div className="flex gap-2">
            <Avatar name="나" size="sm" />
            <input
              type="text"
              placeholder="댓글을 입력하세요... (@멘션)"
              className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      )}
    </article>
  );
}
