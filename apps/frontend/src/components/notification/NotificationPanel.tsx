"use client";

// FlowHub 알림 패널

import React, { useState } from "react";
import { X, CheckCheck, Bell } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Notification } from "@/types";

const mockNotifications: Notification[] = [
  { id: "n1", userId: "u1", type: "TASK_ASSIGNED", title: "새 작업이 할당되었습니다", body: "로그인 페이지 UI 구현", isRead: false, createdAt: "2026-11-10T09:00:00Z" },
  { id: "n2", userId: "u1", type: "FEED_MENTION", title: "멘션되었습니다", body: "@홍길동 확인 부탁드립니다", isRead: false, createdAt: "2026-11-09T14:00:00Z" },
  { id: "n3", userId: "u1", type: "INTEGRATION", title: "CI/CD 파이프라인 실패", body: "build #42 실패", isRead: true, createdAt: "2026-11-08T11:00:00Z" },
];

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [items, setItems] = useState(mockNotifications);

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));

  return (
    <div className="fixed right-4 top-16 z-50 w-80 rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-900">알림</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
            <CheckCheck className="inline h-3.5 w-3.5 mr-1" />모두 읽음
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">알림이 없습니다.</div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={cn(
                "border-b border-slate-100 px-4 py-3 hover:bg-slate-50",
                !n.isRead && "bg-blue-50/50"
              )}
            >
              <div className="flex items-start gap-2">
                {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{n.title}</p>
                  {n.body && <p className="text-xs text-slate-500">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{formatDate(n.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
