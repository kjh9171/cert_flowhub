"use client";

// FlowHub Topbar

import React, { useState, useEffect } from "react";
import { useLayoutStore } from "@/stores/layoutStore";
import { Search, Bell, ChevronDown, Menu, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useI18n } from "@/lib/i18n";
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
  const { lang, setLang, t } = useI18n();
  const openMobileSidebar = useLayoutStore((s) => s.openMobileSidebar);
  const [dark, setDark] = useState(false);
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [activeWs, setActiveWs] = useState<string>("");

  // 실제 워크스페이스 목록 로드 (스위처 표시용)
  useEffect(() => {
    api.get("/workspaces").then((res) => {
      const list: any[] = res.data || [];
      setWorkspaces(list);
      if (list[0] && !activeWs) setActiveWs(list[0].id);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 최신 연동 Badge 2건 (GitHub PR/CI/CD 등) — API 로드 + badge:updated 실시간 반영
  const [liveBadges, setLiveBadges] = useState<
    Array<{ id?: string; status: any; eventType: any; eventLabel: string; targetUrl?: string }>
  >([]);

  useEffect(() => {
    const labelOf: Record<string, string> = {
      COMMIT: "커밋",
      PULL_REQUEST: "PR",
      CI_CD: "CI/CD",
      DEPLOY: "배포",
      EXTERNAL_API: "API",
    };
    const toItem = (b: any) => ({
      id: b.id,
      status: b.status,
      eventType: b.eventType,
      eventLabel: labelOf[b.eventType] ?? "연동",
      targetUrl: b.targetUrl,
    });

    api
      .get("/integrations/badges", { params: { limit: 2 } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
        setLiveBadges(list.slice(0, 2).map(toItem));
      })
      .catch(() => {});

    const s = getSocket();
    const onBadge = (p: any) => {
      if (p?.badge) setLiveBadges((prev) => [toItem(p.badge), ...prev].slice(0, 2));
    };
    s.on("badge:updated", onBadge);
    return () => {
      s.off("badge:updated", onBadge);
    };
  }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("flowhub_theme") : null;
    const isDark =
      saved === "dark" ||
      (!saved && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
    }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("flowhub_theme", next ? "dark" : "light");
  };

  return (
    <header className="relative z-[45] flex h-14 shrink-0 items-center justify-between border-b border-line bg-card px-4">
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={openMobileSidebar}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Workspace switcher */}
        <div className="relative">
          <button
            onClick={() => setWsOpen((o) => !o)}
            className="flex items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
              {(workspaces.find((w) => w.id === activeWs) ?? workspaces[0])?.name?.trim().charAt(0) ?? "F"}
            </div>
            <span className="hidden whitespace-nowrap md:inline">{(workspaces.find((w) => w.id === activeWs) ?? workspaces[0])?.name ?? "워크스페이스"}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {wsOpen && (
            <div className="absolute left-0 z-20 mt-1 w-64 rounded-md border border-slate-200 dark:border-slate-800 bg-white py-1 shadow-md dark:border-slate-700 dark:bg-slate-900">
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setActiveWs(w.id);
                    setWsOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <div className="h-6 w-6 rounded bg-blue-600" />
                  <span className="truncate">{w.name}</span>
                </button>
              ))}
              {workspaces.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">워크스페이스가 없습니다.</p>}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center px-4">
        <button
          onClick={onSearchOpen}
          className="flex w-full max-w-md items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-300 hover:bg-white dark:bg-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 whitespace-nowrap text-left">검색 (⌘K)</span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"
          title="테마 전환"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
        <button
          onClick={() => setLang(lang === "ko" ? "en" : "ko")}
          className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"
        >
          {lang === "ko" ? "EN" : "KO"}
        </button>
        {/* 연동 상태 요약 — 하드코딩 제거, 실제 최신 Badge 2건 표시 + 실시간 갱신 */}
        <div className="hidden items-center gap-1.5 whitespace-nowrap xl:flex">
          {liveBadges.slice(0, 2).map((b, i) => (
            <IntegrationBadge
              key={b.id ?? i}
              status={b.status}
              eventType={b.eventType}
              title={b.eventLabel}
              targetUrl={b.targetUrl}
              size="sm"
            />
          ))}
        </div>

        {/* Notifications */}
        <button
          onClick={onNotificationOpen}
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-700 dark:text-slate-300 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User status — 변경 시 PATCH 후 서버가 user:status로 브로드캐스트 */}
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
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {currentUser ? currentUser.name.charAt(0) : "U"}
        </div>
      </div>
    </header>
  );
}
