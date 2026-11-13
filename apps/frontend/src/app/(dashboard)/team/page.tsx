"use client";

import React, { useEffect, useState } from "react";
import { Users2, Wifi } from "lucide-react";
import api from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { Avatar } from "@/components/ui/Avatar";
import { UserStatusBadge } from "@/components/badge/UserStatusBadge";
import type { User, Workspace, UserStatusInfo } from "@/types";

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [liveCount, setLiveCount] = useState(0);

  // 초기 로드 + 실시간 접속 상태 구독 (user:status)
  useEffect(() => {
    (async () => {
      try {
        const [u, w] = await Promise.all([api.get("/users"), api.get("/workspaces")]);
        setUsers(u.data || []);
        setWorkspaces(w.data || []);
        setLiveCount((u.data || []).filter((x: User) => x.status === "ONLINE").length);
      } catch {
        /* ignore */
      }
    })();

    const s = getSocket();
    const onStatus = (p: UserStatusInfo) => {
      // 해당 멤버의 상태/상태 메시지만 실시간 갱신 (다른 필드 보존)
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === p.userId ? { ...u, status: p.status, statusMessage: p.statusMessage ?? u.statusMessage } : u));
        setLiveCount(next.filter((u) => u.status === "ONLINE").length);
        return next;
      });
    };
    s.on("user:status", onStatus);
    return () => {
      s.off("user:status", onStatus);
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">팀</h1>
        {/* 현재 온라인 인원 — user:status 이벤트로 실시간 갱신 */}
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
          <Wifi className="h-3.5 w-3.5" />
          온라인 {liveCount} / {users.length}
        </span>
      </div>

      <section>
        <h2 className="mb-3 inline-flex items-center gap-1.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Users2 className="h-4 w-4" /> 워크스페이스
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {workspaces.map((w) => (
            <div key={w.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="font-medium text-slate-900 dark:text-slate-100">{w.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{w.description || w.slug}</p>
            </div>
          ))}
          {workspaces.length === 0 && <p className="text-sm text-slate-400">워크스페이스가 없습니다.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">멤버</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Avatar name={u.name} src={u.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900 dark:text-slate-100">{u.name}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {u.statusMessage || u.email}
                </p>
              </div>
              <UserStatusBadge status={u.status} showLabel={false} />
            </div>
          ))}
          {users.length === 0 && <p className="text-sm text-slate-400">멤버가 없습니다.</p>}
        </div>
      </section>
    </div>
  );
}
