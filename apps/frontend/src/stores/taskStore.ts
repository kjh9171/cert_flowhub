// FlowHub 작업 전역 상태 (API + Socket 연동)

import { create } from "zustand";
import type { Task, TaskStatus } from "@/types";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";

const mockTasks: Task[] = [
  {
    id: "t1",
    projectId: "p1",
    workspaceId: "w1",
    title: "로그인 페이지 UI 구현",
    content: "Next.js App Router 기반 로그인 화면",
    status: "IN_PROGRESS",
    priority: "HIGH",
    progress: 60,
    startDate: "2026-11-01",
    endDate: "2026-11-10",
    authorId: "u1",
    assigneeIds: ["u1", "u2"],
    dependencyIds: [],
    createdAt: "2026-10-28T00:00:00Z",
    updatedAt: "2026-11-05T00:00:00Z",
  },
  {
    id: "t2",
    projectId: "p1",
    workspaceId: "w1",
    title: "Prisma 스키마 설계",
    content: "DB 모델 정의",
    status: "DONE",
    priority: "URGENT",
    progress: 100,
    startDate: "2026-10-20",
    endDate: "2026-10-27",
    authorId: "u1",
    assigneeIds: ["u1"],
    dependencyIds: [],
    createdAt: "2026-10-18T00:00:00Z",
    updatedAt: "2026-10-27T00:00:00Z",
  },
  {
    id: "t3",
    projectId: "p1",
    workspaceId: "w1",
    title: "Socket.io 실시간 연동",
    content: "Badge 업데이트 브로드캐스트",
    status: "REQUESTED",
    priority: "MEDIUM",
    progress: 0,
    startDate: "2026-11-12",
    endDate: "2026-11-20",
    authorId: "u2",
    assigneeIds: ["u2"],
    dependencyIds: ["t1"],
    createdAt: "2026-11-01T00:00:00Z",
    updatedAt: "2026-11-01T00:00:00Z",
  },
  {
    id: "t4",
    projectId: "p2",
    workspaceId: "w1",
    title: "지식 베이스 에디터",
    content: "마크다운 WYSIWYG",
    status: "PAUSED",
    priority: "LOW",
    progress: 30,
    startDate: "2026-11-05",
    endDate: "2026-11-25",
    authorId: "u1",
    assigneeIds: ["u3"],
    dependencyIds: [],
    createdAt: "2026-11-02T00:00:00Z",
    updatedAt: "2026-11-06T00:00:00Z",
  },
];

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
  subscribeSocket: () => () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: mockTasks,
  view: "KANBAN",
  loading: false,
  setView: (v) => set({ view: v }),
  loadTasks: async (params) => {
    set({ loading: true });
    try {
      const res = await api.get("/tasks", { params });
      set({ tasks: (res.data || []).map(mapApiTask), loading: false });
    } catch {
      // fallback to mock data
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
    return () => s.off("task:updated", handler);
  },
}));
