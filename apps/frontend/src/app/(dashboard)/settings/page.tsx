"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserStatusBadge } from "@/components/badge/UserStatusBadge";
import { useUserStore } from "@/stores/userStore";
import type { UserStatus } from "@/types";

export default function SettingsPage() {
  const { currentUser, setUser, setStatus } = useUserStore();
  const [name, setName] = useState(currentUser?.name || "");
  const [statusMessage, setStatusMessage] = useState(currentUser?.statusMessage || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/users/me");
        setUser(res.data);
        setName(res.data.name);
        setStatusMessage(res.data.statusMessage || "");
      } catch {
        /* ignore */
      }
    })();
  }, [setUser]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await api.patch("/users/me", { name, statusMessage });
      setMsg("저장되었습니다.");
    } catch {
      setMsg("저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("flowhub_token");
    window.location.href = "/login";
  };

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">설정</h1>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">프로필</h2>
        <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="상태 메시지" value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} />
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">현재 상태:</span>
          {currentUser && (
            <UserStatusBadge
              status={currentUser.status}
              interactive
              onChange={(s: UserStatus) => {
                setStatus(s);
                api.patch("/users/me/status", { status: s }).catch(() => {});
              }}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </Button>
          {msg && <span className="text-sm text-slate-500">{msg}</span>}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">계정</h2>
        <Button variant="danger" onClick={logout}>로그아웃</Button>
      </section>
    </div>
  );
}
