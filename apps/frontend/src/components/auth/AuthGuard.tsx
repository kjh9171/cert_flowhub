"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";
import { useUserStore } from "@/stores/userStore";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useUserStore((s) => s.setUser);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("flowhub_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    // 토큰 존재만으로 신뢰하지 않고, 실제 사용자 정보를 서버에서 확인 (만료/위조 토큰 차단)
    api
      .get("/users/me")
      .then((res) => {
        setUser(res.data);
        setReady(true);
      })
      .catch(() => {
        localStorage.removeItem("flowhub_token");
        router.replace("/login");
      });
  }, [router, pathname, setUser]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#090d16]">
        <div className="text-sm text-slate-400">인증 확인 중...</div>
      </div>
    );
  }
  return <>{children}</>;
}
