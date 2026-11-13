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
  Newspaper,
  ClipboardList,
  ShoppingCart,
  Megaphone,
  Tag,
  Package,
  DraftingCompass,
  Smartphone,
  Mail,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layoutStore";
import { useI18n } from "@/lib/i18n";
import { useUserStore } from "@/stores/userStore";
import api from "@/lib/api";

const collabNavItems = [
  { href: "/", icon: LayoutDashboard, key: "dashboard" },
  { href: "/feed", icon: Newspaper, key: "feed" },
  { href: "/tasks", icon: Kanban, key: "tasks" },
  { href: "/calendar", icon: Calendar, key: "calendar" },
  { href: "/gantt", icon: GanttChart, key: "gantt" },
  { href: "/knowledge", icon: BookOpen, key: "knowledge" },
  { href: "/team", icon: Users, key: "team" },
];

const opsNavItems = [
  { href: "/orders", icon: ClipboardList, key: "orders" },
  { href: "/market-orders", icon: ShoppingCart, key: "marketOrders" },
  { href: "/handover-memos", icon: Megaphone, key: "handover" },
  { href: "/price-items", icon: Tag, key: "priceItems" },
  { href: "/inventory", icon: Package, key: "inventory" },
  { href: "/drawings", icon: DraftingCompass, key: "drawings" },
  { href: "/sms", icon: Smartphone, key: "sms" },
  { href: "/mail", icon: Mail, key: "mail" },
  { href: "/keywords", icon: TrendingUp, key: "keywords" },
];

const adminNavItems = [{ href: "/settings", icon: Settings, key: "settings" }];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useLayoutStore();
  const { t } = useI18n();
  const currentUser = useUserStore((s) => s.currentUser);
  // 실제 프로젝트 목록 (지식 베이스 폴더가 아니라 /projects API의 프로젝트들)
  const [projects, setProjects] = React.useState<Array<{ id: string; name: string; color?: string }>>([]);
  React.useEffect(() => {
    api.get("/projects").then((res) => setProjects(res.data || [])).catch(() => {});
  }, []);

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
          "flex h-screen flex-col border-r border-line bg-card transition-all duration-200 dark:bg-card",
          // Desktop
          "md:relative md:translate-x-0",
          sidebarCollapsed ? "md:w-16" : "md:w-60",
          // Mobile drawer
          "fixed inset-y-0 left-0 z-50 w-64 md:static",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
      <div className="flex h-14 items-center justify-between border-b border-line px-4">
        {!sidebarCollapsed && <span className="text-lg font-bold text-blue-600">FlowHub</span>}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-400"
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <NavGroup label={t("groupCollab")} collapsed={sidebarCollapsed} />
        {collabNavItems.map((item) => (
          <SidebarLink key={item.href} href={item.href} icon={item.icon} label={t(item.key)} collapsed={sidebarCollapsed} />
        ))}

        {!sidebarCollapsed && (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between px-3 pt-1">
              <span className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">프로젝트</span>
              <button className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {projects.map((p) => (
              <Link
                key={p.id}
                href="/projects"
                onClick={closeMobileSidebar}
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.color || "#2563EB" }} />
                <span className="truncate">{p.name}</span>
              </Link>
            ))}
          </div>
        )}

        <NavGroup label={t("groupOps")} collapsed={sidebarCollapsed} />
        {opsNavItems.map((item) => (
          <SidebarLink key={item.href} href={item.href} icon={item.icon} label={t(item.key)} collapsed={sidebarCollapsed} />
        ))}

        <NavGroup label={t("groupAdmin")} collapsed={sidebarCollapsed} />
        {adminNavItems.map((item) => (
          <SidebarLink key={item.href} href={item.href} icon={item.icon} label={t(item.key)} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-400">
            {currentUser?.name?.trim().charAt(0) ?? "FlowHub".charAt(0)}
          </div>
          {!sidebarCollapsed && <span className="truncate">{currentUser?.name ?? "사용자"}</span>}
        </button>
      </div>
    </aside>
    </>
  );
}

function NavGroup({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="mx-2 my-2 border-t border-line" aria-hidden="true" />;
  }
  return (
    <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {label}
    </div>
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
          : "text-slate-600 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}
