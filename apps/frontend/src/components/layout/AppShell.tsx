"use client";

// FlowHub AppShell 레이아웃

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { RightPanel } from "@/components/layout/RightPanel";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { NotificationPanel } from "@/components/notification/NotificationPanel";
import { I18nProvider } from "@/lib/i18n";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <I18nProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#090d16]">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar
            onSearchOpen={() => setSearchOpen(true)}
            onNotificationOpen={() => setNotifOpen((o) => !o)}
            unreadCount={5}
          />
          <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#090d16]">{children}</main>
        </div>
        <RightPanel />
        <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
        {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
      </div>
    </I18nProvider>
  );
}
