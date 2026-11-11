// FlowHub 공통 유틸리티

import { TaskPriority, TaskStatus, UserStatus, IntegrationStatus } from "@/types";

export const priorityLabel: Record<TaskPriority, string> = {
  URGENT: "긴급",
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

export const priorityColor: Record<TaskPriority, string> = {
  URGENT: "#DC2626",
  HIGH: "#D97706",
  MEDIUM: "#2563EB",
  LOW: "#64748B",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  REQUESTED: "요청",
  IN_PROGRESS: "진행",
  PAUSED: "일시정지",
  DONE: "완료",
  CANCELLED: "취소",
};

export const userStatusLabel: Record<UserStatus, string> = {
  ONLINE: "온라인",
  AWAY: "자리비움",
  BUSY: "다른 업무 중",
  OFFLINE: "오프라인",
};

export const userStatusColor: Record<UserStatus, string> = {
  ONLINE: "bg-green-500",
  AWAY: "bg-amber-500",
  BUSY: "bg-blue-500",
  OFFLINE: "bg-slate-400",
};

export const integrationStatusLabel: Record<IntegrationStatus, string> = {
  SUCCESS: "성공",
  IN_PROGRESS: "진행중",
  FAILED: "실패",
  PENDING: "대기",
};

export const integrationStatusColor: Record<IntegrationStatus, string> = {
  SUCCESS: "bg-green-500 text-green-700",
  IN_PROGRESS: "bg-blue-500 text-blue-700",
  FAILED: "bg-red-500 text-red-700",
  PENDING: "bg-slate-400 text-slate-600",
};

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
