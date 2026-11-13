// FlowHub 작업 전역 상태 (API + Socket 연동)

import { create } from "zustand";
import type { Task, TaskStatus, IntegrationStatus, IntegrationEventType } from "@/types";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

function mapApiTask(t: any): Task {
  return {
    id: t.id,
    projectId: t.projectId || undefined,
    workspaceId: t.workspaceId || undefined,
    title: t.title,
    content: t.content || "",
    status: t.status,
    priority: t.priority,
    progress: t.progress ?? 0,
    startDate: t.startDate ? t.startDate.slice(0, 10) : undefined,
    endDate: t.endDate ? t.endDate.slice(0, 10) : undefined,
    dueDate: t.dueDate ? t.dueDate.slice(0, 10) : undefined,
    authorId: t.authorId,
    assigneeIds: (t.assignees || []).map((a: any) => a.userId || a.user?.id).filter(Boolean),
    dependencyIds: (t.dependencies || []).map((d: any) => d.dependsOnTaskId),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    position: typeof t.position === "number" ? t.position : undefined,
    badges: Array.isArray(t.badges)
      ? t.badges.map((b: any) => ({ status: b.status, eventType: b.eventType }))
      : undefined,
  };
}

interface TaskState {
  tasks: Task[];
  view: "FEED" | "KANBAN" | "CALENDAR" | "GANTT";
  loading: boolean;
  setView: (v: TaskState["view"]) => void;
  loadTasks: (params?: Record<string, string>) => Promise<void>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  moveTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  /** 현재 사용자/워크스페이스의 최신 연동 Badge 목록 (실시간 갱신) */
  badges: Array<{ status: IntegrationStatus; eventType: IntegrationEventType }>;
  loadBadges: () => Promise<void>;
  subscribeSocket: () => () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  view: "KANBAN",
  loading: false,
  badges: [],
  loadBadges: async () => {
    try {
      const res = await api.get("/integrations/badges", { params: { limit: 6 } });
      const list = (res.data || []).map((b: any) => ({ status: b.status, eventType: b.eventType }));
      set({ badges: list });
    } catch {
      /* API 미실행 시 빈 상태로 유지 */
    }
  },
  setView: (v) => set({ view: v }),
  loadTasks: async (params) => {
    set({ loading: true });
    try {
      const res = await api.get("/tasks", { params });
      set({ tasks: (res.data || []).map(mapApiTask), loading: false });
    } catch {
      // API 오류 시 이전 목록 유지
      set({ loading: false });
    }
  },
  updateTask: async (id, patch) => {
    // optimistic
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    try {
      await api.patch(`/tasks/${id}`, {
        title: patch.title,
        content: patch.content,
        status: patch.status,
        priority: patch.priority,
        progress: patch.progress,
        startDate: patch.startDate,
        endDate: patch.endDate,
      });
    } catch {
      /* keep optimistic */
    }
  },
  moveTaskStatus: async (id, status) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
    try {
      await api.patch(`/tasks/${id}`, { status });
      getSocket().emit("task:updated", { taskId: id, status });
    } catch {
      /* keep optimistic */
    }
  },
  subscribeSocket: () => {
    const s = getSocket();
    // 연동 Badge 실시간 갱신 (GitHub/CI/CD/외부 API 상태 변경)
    const badgeHandler = (payload: any) => {
      if (payload?.status && payload?.eventType) {
        set((state) => ({
          badges: [{ status: payload.status, eventType: payload.eventType }, ...state.badges].slice(0, 8),
        }));
      }
    };
    s.on("badge:updated", badgeHandler);
    const handler = (payload: any) => {
      if (payload?.action === "updated" && payload.task) {
        const mapped = mapApiTask(payload.task);
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === mapped.id ? { ...t, ...mapped } : t)),
        }));
      } else if (payload?.action === "created" && payload.task) {
        const mapped = mapApiTask(payload.task);
        set((state) => ({ tasks: [mapped, ...state.tasks] }));
      } else if (payload?.action === "deleted") {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== payload.taskId) }));
      } else if (payload?.taskId && payload?.status) {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === payload.taskId ? { ...t, status: payload.status } : t)),
        }));
      }
    };
    s.on("task:updated", handler);
    return () => {
      s.off("task:updated", handler);
      s.off("badge:updated", badgeHandler);
    };
  },
}));
