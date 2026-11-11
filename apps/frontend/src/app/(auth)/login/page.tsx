"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@flowhub.local");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = mode === "login" ? "/auth/login" : "/auth/register";
      const body = mode === "login" ? { email, password } : { email, password, name: name || email.split("@")[0] };
      const res = await api.post(url, body);
      localStorage.setItem("flowhub_token", res.data.token);
      router.push("/");
    } catch (err: any) {
      setError(err?.response?.data?.message || "요청 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 text-center">FlowHub</h1>
        <p className="text-sm text-slate-500 text-center">
          {mode === "login" ? "로그인" : "회원가입"}
        </p>
        {mode === "register" && (
          <Input label="이름" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <Input label="이메일" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </Button>
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="w-full text-sm text-blue-600 hover:underline"
        >
          {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있나요? 로그인"}
        </button>
      </form>
    </div>
  );
}
