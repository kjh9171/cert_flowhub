"use client";

// FlowHub 대시보드 홈

import React, { useEffect, useState } from "react";
import { Kanban, Users, Bell, CheckCircle2, Plus, ClipboardList, ShoppingCart, Package, Mail } from "lucide-react";
import { IntegratedCalendar } from "@/components/calendar/IntegratedCalendar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/stores/taskStore";
import { useUserStore } from "@/stores/userStore";
import { UserStatusBadge } from "@/components/badge/UserStatusBadge";
import { IntegrationBadge } from "@/components/badge/IntegrationBadge";
import { ViewSwitcher } from "@/components/common/ViewSwitcher";
import { GanttChart, GanttLegend } from "@/components/gantt/GanttChart";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { CalendarView } from "@/components/calendar/CalendarView";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { useLayoutStore } from "@/stores/layoutStore";
import { TaskCreateModal } from "@/components/task/TaskCreateModal";
import { TaskDetailPanel } from "@/components/task/TaskDetailPanel";
import api from "@/lib/api";
import type { FeedPost, User } from "@/types";

// Date → YYYY-MM-DD (로컬 기준, 타임존 오차 방지)
const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function DashboardPage() {
  const { tasks, view, setView, loadTasks, subscribeSocket } = useTaskStore();
  useEffect(() => {
    loadTasks();
    const unsub = subscribeSocket();
    return unsub;
  }, [loadTasks, subscribeSocket]);

  const { currentUser } = useUserStore();
  const { openRightPanel } = useLayoutStore();
  const [modalOpen, setModalOpen] = useState(false);
  const reload = () => loadTasks();

  // 실제 API 데이터 — 멤버/미읽음 알림/최신 연동 Badge/최근 피드
  const [memberCount, setMemberCount] = useState(0);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [userMap, setUserMap] = useState<Record<string, { name: string }>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestBadge, setLatestBadge] = useState<any | null>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  // ERP KPI
  const [todayOrders, setTodayOrders] = useState(0);
  const [unshippedMarket, setUnshippedMarket] = useState(0);
  const [lowStockInventory, setLowStockInventory] = useState(0);
  const [unreadEmails, setUnreadEmails] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [u, n, b, f] = await Promise.all([
          api.get("/users"),
          api.get("/notifications"),
          api.get("/integrations/badges", { params: { limit: 1 } }),
          api.get("/feed", { params: { limit: 5 } }),
        ]);

        // ERP KPI — 실패해도 대시보드는 렌더링
        try {
          const today = new Date().toISOString().slice(0, 10);
          const [o, m, i, em] = await Promise.all([
            api.get("/orders"),
            api.get("/market-orders", { params: { unshippedOnly: "true" } }),
            api.get("/inventory", { params: { lowStockOnly: "true" } }),
            api.get("/emails", { params: { unreadOnly: "true" } }),
          ]);
          const orders: any[] = Array.isArray(o.data) ? o.data : [];
          setTodayOrders(orders.filter((x) => String(x.createdAt ?? "").slice(0, 10) === today).length);
          setUnshippedMarket(Array.isArray(m.data) ? m.data.length : 0);
          setLowStockInventory(Array.isArray(i.data) ? i.data.length : 0);
          setUnreadEmails(Array.isArray(em.data) ? em.data.length : 0);
        } catch { /* ERP 미연결 시 0 유지 */ }
        const users: User[] = u.data || [];
        setMemberCount(users.length);
        const uMap: Record<string, User> = {};
        const nMap: Record<string, { name: string }> = {};
        users.forEach((x) => {
          uMap[x.id] = x;
          nMap[x.id] = { name: x.name };
        });
        setUsersMap(uMap);
        setUserMap(nMap);

        const notifs: any[] = Array.isArray(n.data) ? n.data : (n.data?.items ?? n.data?.notifications ?? []);
        setUnreadCount(notifs.filter((x) => !x.isRead).length);

        const badges: any[] = Array.isArray(b.data) ? b.data : (b.data?.items ?? []);
        setLatestBadge(badges[0] ?? null);

        const posts: any[] = Array.isArray(f.data) ? f.data : (f.data?.items ?? f.data?.posts ?? []);
        setFeedPosts(posts.slice(0, 5));
      } catch {
        /* API 미실행 시 0/빈 상태로 표시 */
      }
    })();
  }, []);

  const stats = [
    { label: "금일 발주", value: todayOrders, icon: ClipboardList, color: "text-amber-600" },
    { label: "미발송 주문", value: unshippedMarket, icon: ShoppingCart, color: "text-orange-600" },
    { label: "부족 재고", value: lowStockInventory, icon: Package, color: "text-rose-600" },
    { label: "미처리 메일", value: unreadEmails, icon: Mail, color: "text-cyan-600" },
    { label: "진행 중 작업", value: tasks.filter((t) => t.status === "IN_PROGRESS").length, icon: Kanban, color: "text-blue-600" },
    { label: "완료 작업", value: tasks.filter((t) => t.status === "DONE").length, icon: CheckCircle2, color: "text-green-600" },
    { label: "팀 멤버", value: memberCount, icon: Users, color: "text-purple-600" },
    { label: "미읽음 알림", value: unreadCount, icon: Bell, color: "text-slate-500" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">대시보드</h1>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            안녕하세요, {currentUser?.name}님. 오늘도 좋은 하루 되세요.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          {currentUser && <UserStatusBadge status={currentUser.status} showLabel />}
          {latestBadge && <IntegrationBadge status={latestBadge.status} eventType={latestBadge.eventType} title={latestBadge.title} targetUrl={latestBadge.targetUrl} size="sm" />}
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> 새 작업
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 2xl:grid-cols-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-line bg-card p-3 shadow-sm">
            <div className="flex items-center justify-between gap-1.5">
              <p className="truncate whitespace-nowrap text-[11px] font-medium text-ink2">{s.label}</p>
              <s.icon className={cn("h-4 w-4 shrink-0", s.color)} />
            </div>
            <p className="mt-1.5 text-2xl font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>

      {/* View switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">작업</h2>
        <ViewSwitcher value={view} onChange={setView} />
      </div>

      {/* Task views */}
      {view === "KANBAN" && (
        <KanbanBoard
          tasks={tasks}
          userMap={userMap}
          onStatusChange={(id, status) => useTaskStore.getState().moveTaskStatus(id, status)}
          onTaskClick={(t) =>
            openRightPanel(<TaskDetailPanel task={t} onUpdated={reload} />)
          }
        />
      )}
      {view === "GANTT" && (
        <div className="space-y-3">
          <GanttLegend />
          <GanttChart
            tasks={tasks}
            onTaskClick={(t) =>
              openRightPanel(<TaskDetailPanel task={t} onUpdated={reload} />)
            }
            onDateChange={(id, start, end) =>
              useTaskStore.getState().updateTask(id, { startDate: fmtDate(start), endDate: fmtDate(end) })
            }
            onProgressChange={(id, progress) => useTaskStore.getState().updateTask(id, { progress })}
          />
        </div>
      )}
      {view === "CALENDAR" && (
        <CalendarView
          tasks={tasks}
          onTaskClick={(t) =>
            openRightPanel(<TaskDetailPanel task={t} onUpdated={reload} />)
          }
        />
      )}
      {view === "FEED" && (
        <div className="space-y-4">
          {feedPosts.map((p: any) => (
            <FeedPostCard key={p.id} post={p} author={usersMap[p.authorId] ?? p.author} />
          ))}
          {feedPosts.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-400">아직 피드가 없습니다. 작업을 공유해 보세요.</p>
          )}
        </div>
      )}

      {/* 통합 월간 캘린더 (발주/일정/통화) */}
      <IntegratedCalendar />

      {/* Recent feed */}
      {view !== "FEED" && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">최근 피드</h2>
          <div className="space-y-4">
            {feedPosts.map((p: any) => (
              <FeedPostCard key={p.id} post={p} author={usersMap[p.authorId] ?? p.author} />
            ))}
            {feedPosts.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-400">아직 피드가 없습니다. 첫 소식을 남겨보세요.</p>
            )}
          </div>
        </section>
      )}
      <TaskCreateModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={reload} />
    </div>
  );
}
