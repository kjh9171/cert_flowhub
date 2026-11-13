"use client";

// FlowHub AppShell 레이아웃

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { RightPanel } from "@/components/layout/RightPanel";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { NotificationPanel } from "@/components/notification/NotificationPanel";
import { I18nProvider } from "@/lib/i18n";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  // 미읽음 알림 수 — 하드코딩 대신 API + 실시간(notification:new) 연동
  const [unreadCount, setUnreadCount] = useState(0);

  // ⌘K / Ctrl+K 글로벌 검색 단축키
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/notifications");
        const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? res.data?.notifications ?? []);
        setUnreadCount(list.filter((n: any) => !n.isRead).length);
      } catch {
        /* 미로그인/오류 시 0 유지 */
      }
    };
    load();

    const s = getSocket();
    const onNew = (n: any) => {
      if (n && !n.isRead) setUnreadCount((c) => c + 1);
    };
    s.on("notification:new", onNew);
    return () => {
      s.off("notification:new", onNew);
    };
  }, []);

  return (
    <I18nProvider>
      <div className="flex h-screen overflow-hidden bg-canvas">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar
            onSearchOpen={() => {
              // 검색 모달을 열 때 알림 패널은 닫기 (두 레이어 겹침 방지)
              setNotifOpen(false);
              setSearchOpen(true);
            }}
            onNotificationOpen={async () => {
              setNotifOpen((o) => !o);
              // 패널 열 때 서버와 동기화 (읽음 처리 반영)
              try {
                const res = await api.get("/notifications");
                const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? res.data?.notifications ?? []);
                setUnreadCount(list.filter((n: any) => !n.isRead).length);
              } catch { /* ignore */ }
            }}
            unreadCount={unreadCount}
          />
          <main className="flex-1 overflow-y-auto bg-canvas">{children}</main>
        </div>
        <RightPanel />
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        {notifOpen &&(
          <NotificationPanel
            onClose={() => {
              setNotifOpen(false);
              // 패널 닫힌 뒤 읽음 카운트 재동기화
              api.get("/notifications").then((res) => {
                const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? res.data?.notifications ?? []);
                setUnreadCount(list.filter((n: any) => !n.isRead).length);
              }).catch(() => {});
            }}
          />
        )}
      </div>
    </I18nProvider>
  );
}
