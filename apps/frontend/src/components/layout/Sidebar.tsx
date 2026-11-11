"use client";

// FlowHub Sidebar

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  Calendar,
  GanttChart,
  BookOpen,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layoutStore";
import { useI18n } from "@/lib/i18n";

const navItems = [
  { href: "/", icon: LayoutDashboard, key: "dashboard" },
  { href: "/tasks", icon: Kanban, key: "tasks" },
  { href: "/calendar", icon: Calendar, key: "calendar" },
  { href: "/gantt", icon: GanttChart, key: "gantt" },
  { href: "/knowledge", icon: BookOpen, key: "knowledge" },
  { href: "/team", icon: Users, key: "team" },
  { href: "/settings", icon: Settings, key: "settings" },
];

const projects = [
  { id: "p1", name: "FlowHub 플랫폼", color: "#2563EB" },
  { id: "p2", name: "지식 베이스", color: "#16A34A" },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useLayoutStore();
  const { t } = useI18n();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200 dark:border-slate-800 dark:bg-slate-900",
          // Desktop
          "md:relative md:translate-x-0",
          sidebarCollapsed ? "md:w-16" : "md:w-60",
          // Mobile drawer
          "fixed inset-y-0 left-0 z-50 w-64 md:static",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
      <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
        {!sidebarCollapsed && <span className="text-lg font-bold text-blue-600">FlowHub</span>}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {navItems.map((item) => (
          <SidebarLink key={item.href} href={item.href} icon={item.icon} label={t(item.key)} collapsed={sidebarCollapsed} />
        ))}

        {!sidebarCollapsed && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-semibold uppercase text-slate-400">프로젝트</span>
              <button className="text-slate-400 hover:text-blue-600">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {projects.map((p) => (
              <button
                key={p.id}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color }} />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          <div className="h-7 w-7 rounded-full bg-blue-100 text-center text-xs font-semibold leading-7 text-blue-700">
            홍
          </div>
          {!sidebarCollapsed && <span className="truncate">홍길동</span>}
        </button>
      </div>
    </aside>
    </>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  label,
  collapsed,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const closeMobileSidebar = useLayoutStore((s) => s.closeMobileSidebar);
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      onClick={closeMobileSidebar}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-blue-50 text-blue-700 font-medium dark:bg-blue-950/60 dark:text-blue-400"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
