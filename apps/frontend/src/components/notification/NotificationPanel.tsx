"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { X, CheckCheck, Bell } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Notification } from "@/types";

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [items, setItems] = useState<Notification[]>([]);

  // Esc 키로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const load = async () => {
    try {
      const res = await api.get("/notifications");
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? res.data?.notifications ?? []);
      setItems(list);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const s = getSocket();
    const handler = (n: any) => {
      setItems((prev) => [n, ...prev]);
    };
    s.on("notification:new", handler);
    return () => {
      s.off("notification:new", handler);
    };
  }, []);

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      /* ignore */
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all");
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {/* 바깥 클릭 시 닫기 (투명 백드롭) */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div className="fixed right-4 top-16 z-50 w-80 rounded-lg border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">알림</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
            <CheckCheck className="inline h-3.5 w-3.5 mr-1" />모두 읽음
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
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
              onClick={() => !n.isRead && markRead(n.id)}
              className={cn(
                "border-b border-slate-100 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer",
                !n.isRead && "bg-blue-50/50"
              )}
            >
              <div className="flex items-start gap-2">
                {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</p>
                  {n.body && <p className="text-xs text-slate-500 dark:text-slate-400">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{formatDate(n.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </>
  );
}
