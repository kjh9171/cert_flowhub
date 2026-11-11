"use client";

// FlowHub 대시보드 홈

import React, { useEffect, useState } from "react";
import { LayoutDashboard, Kanban, BookOpen, Users, Bell, CheckCircle2, Plus } from "lucide-react";
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
import type { FeedPost, User } from "@/types";

const mockPosts: FeedPost[] = [
  {
    id: "fp1",
    workspaceId: "w1",
    authorId: "u1",
    type: "ANNOUNCEMENT",
    title: "FlowHub 개발 킥오프",
    content: "## 환영합니다\nFlowHub 통합 협업 플랫폼 개발을 시작합니다. **모두 화이팅!**",
    isPinned: true,
    createdAt: "2026-11-10T09:00:00Z",
  },
  {
    id: "fp2",
    workspaceId: "w1",
    projectId: "p1",
    authorId: "u2",
    type: "SHARE",
    content: "Prisma 스키마 초안 공유합니다. 리뷰 부탁드립니다.",
    isPinned: false,
    createdAt: "2026-11-09T14:30:00Z",
  },
];

const mockUsers: Record<string, User> = {
  u1: { id: "u1", name: "홍길동", email: "hong@flowhub.local", role: "ADMIN", status: "ONLINE" },
  u2: { id: "u2", name: "김철수", email: "kim@flowhub.local", role: "MEMBER", status: "BUSY" },
};

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

  const stats = [
    { label: "진행 중 작업", value: tasks.filter((t) => t.status === "IN_PROGRESS").length, icon: Kanban, color: "text-blue-600" },
    { label: "완료 작업", value: tasks.filter((t) => t.status === "DONE").length, icon: CheckCircle2, color: "text-green-600" },
    { label: "팀 멤버", value: 8, icon: Users, color: "text-purple-600" },
    { label: "미읽음 알림", value: 5, icon: Bell, color: "text-amber-600" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
          <p className="text-sm text-slate-500">
            안녕하세요, {currentUser?.name}님. 오늘도 좋은 하루 되세요.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentUser && <UserStatusBadge status={currentUser.status} showLabel />}
          <IntegrationBadge status="IN_PROGRESS" eventType="CI_CD" title="CI/CD 빌드" />
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> 새 작업
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{s.label}</p>
              <s.icon className={cn("h-5 w-5", s.color)} />
            </div>
            <p className="mt-2 text-3xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* View switcher */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">작업</h2>
        <ViewSwitcher value={view} onChange={setView} />
      </div>

      {/* Task views */}
      {view === "KANBAN" && (
        <KanbanBoard
          tasks={tasks}
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
          {mockPosts.map((p) => (
            <FeedPostCard key={p.id} post={p} author={mockUsers[p.authorId]} />
          ))}
        </div>
      )}

      {/* Recent feed */}
      {view !== "FEED" && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">최근 피드</h2>
          <div className="space-y-4">
            {mockPosts.map((p) => (
              <FeedPostCard key={p.id} post={p} author={mockUsers[p.authorId]} />
            ))}
          </div>
        </section>
      )}
      <TaskCreateModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={reload} />
    </div>
  );
}
