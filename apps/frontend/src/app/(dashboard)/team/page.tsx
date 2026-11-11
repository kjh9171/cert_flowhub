"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { UserStatusBadge } from "@/components/badge/UserStatusBadge";
import type { User, Workspace } from "@/types";

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [u, w] = await Promise.all([api.get("/users"), api.get("/workspaces")]);
        setUsers(u.data || []);
        setWorkspaces(w.data || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">팀</h1>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">워크스페이스</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {workspaces.map((w) => (
            <div key={w.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-medium text-slate-900">{w.name}</p>
              <p className="text-sm text-slate-500">{w.description || w.slug}</p>
            </div>
          ))}
          {workspaces.length === 0 && <p className="text-sm text-slate-400">워크스페이스가 없습니다.</p>}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">멤버</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <Avatar name={u.name} src={u.avatarUrl} />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-slate-900">{u.name}</p>
                <p className="truncate text-xs text-slate-500">{u.email}</p>
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
