"use client";

// FlowHub Topbar

import React, { useState } from "react";
import { Search, Bell, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { UserStatusBadge } from "@/components/badge/UserStatusBadge";
import { IntegrationBadge } from "@/components/badge/IntegrationBadge";
import { useUserStore } from "@/stores/userStore";
import type { UserStatus } from "@/types";

interface TopbarProps {
  onSearchOpen: () => void;
  onNotificationOpen: () => void;
  unreadCount?: number;
}

export function Topbar({ onSearchOpen, onNotificationOpen, unreadCount = 0 }: TopbarProps) {
  const { currentUser, setStatus } = useUserStore();
  const [wsOpen, setWsOpen] = useState(false);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        {/* Workspace switcher */}
        <div className="relative">
          <button
            onClick={() => setWsOpen((o) => !o)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
              F
            </div>
            <span className="hidden sm:inline">FlowHub 워크스페이스</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {wsOpen && (
            <div className="absolute left-0 z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-md">
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                <div className="h-6 w-6 rounded bg-blue-600" />
                FlowHub 워크스페이스
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">
                <PlusIcon />
                새 워크스페이스
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        <button
          onClick={onSearchOpen}
          className="flex w-full max-w-md items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-300 hover:bg-white"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">검색 (⌘K)</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Integration status summary */}
        <div className="hidden items-center gap-1.5 md:flex">
          <IntegrationBadge status="IN_PROGRESS" eventType="CI_CD" title="CI/CD" size="sm" />
          <IntegrationBadge status="SUCCESS" eventType="PULL_REQUEST" title="PR #42" size="sm" />
        </div>

        {/* Notifications */}
        <button
          onClick={onNotificationOpen}
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User status */}
        {currentUser && (
          <UserStatusBadge
            status={currentUser.status}
            interactive
            onChange={(s: UserStatus) => {
              setStatus(s);
              api.patch("/users/me/status", { status: s }).catch(() => {});
            }}
          />
        )}

        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
          {currentUser ? currentUser.name.charAt(0) : "U"}
        </div>
      </div>
    </header>
  );
}

function PlusIcon() {
  return <span className="text-lg leading-none">+</span>;
}
