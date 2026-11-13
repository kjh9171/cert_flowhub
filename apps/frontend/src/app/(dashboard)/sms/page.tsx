"use client";

// FlowHub 비즈니스 문자(SMS/MMS) — 스레드 목록 + 대화 뷰 + 안읽음 필터 + 첨부 사진

import React, { useEffect, useRef, useState } from "react";
import { Smartphone, Search, Send, Image, Trash2, CheckCheck, X, Phone } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { SmsThread, SmsMessage } from "@/types";

export default function SmsPage() {
  const [threads, setThreads] = useState<SmsThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [active, setActive] = useState<SmsThread | null>(null);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    try {
      const res = await api.get("/sms/threads", { params: { q: q || undefined, unreadOnly: unreadOnly ? "true" : undefined } });
      setThreads(Array.isArray(res.data) ? res.data : []);
    } catch { setThreads([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(loadThreads, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, unreadOnly]);

  const openThread = async (thread: SmsThread) => {
    setActive(thread);
    try {
      const res = await api.get(`/sms/threads/${thread.id}/messages`);
      setMessages(Array.isArray(res.data) ? res.data : []);
      setThreads((prev) => prev.map((t) => (t.id === thread.id ? { ...t, unreadCount: 0 } : t)));
    } catch { setMessages([]); }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const uploadAttachment = async (file: File) => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setAttachments((p) => [...p, res.data.fileUrl]);
    } catch {
      alert("첨부 업로드 실패");
    }
  };

  const send = async () => {
    if (!active || !draft.trim()) return;
    setSending(true);
    try {
      await api.post("/sms/messages", {
        participantPhone: active.participantPhone,
        participantName: active.participantName || undefined,
        content: draft.trim(),
        attachments,
      });
      setDraft("");
      setAttachments([]);
      await openThread(active);
      await loadThreads();
    } finally {
      setSending(false);
    }
  };

  const startThread = async () => {
    if (!newPhone.trim() || !draft.trim()) return;
    setSending(true);
    try {
      await api.post("/sms/messages", {
        participantPhone: newPhone.trim(),
        participantName: newName.trim() || undefined,
        content: draft.trim(),
        attachments,
      });
      setShowCompose(false);
      setNewPhone(""); setNewName(""); setDraft(""); setAttachments([]);
      await loadThreads();
    } finally {
      setSending(false);
    }
  };

  const removeThread = async (thread: SmsThread) => {
    if (!window.confirm(`${thread.participantName || thread.participantPhone}님과의 대화를 삭제할까요?`)) return;
    await api.delete(`/sms/threads/${thread.id}`);
    if (active?.id === thread.id) { setActive(null); setMessages([]); }
    await loadThreads();
  };

  const unread = threads.reduce((s, t) => s + t.unreadCount, 0);

  return (
    <div className="flex h-full">
      {/* 스레드 목록 */}
      <div className="flex w-80 shrink-0 flex-col border-r border-line bg-card">
        <div className="flex h-14 items-center justify-between gap-2 border-b border-line px-4">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-violet-500" />
            <h1 className="text-lg font-bold text-ink">문자</h1>
            {unread > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{unread}</span>}
          </div>
          <button onClick={() => setShowCompose((v) => !v)} className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">새 문자</button>
        </div>
        <div className="space-y-2 border-b border-line p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 번호 검색..." className="h-8 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none" />
          </div>
          <button onClick={() => setUnreadOnly((v) => !v)} aria-pressed={unreadOnly} className={cn("flex h-8 w-full items-center justify-center gap-1.5 rounded-md border text-xs font-medium", unreadOnly ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : "border-line text-ink2")}>
            <CheckCheck className="h-3.5 w-3.5" /> 안읽은 대화만
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.map((t) => {
            const last = t.messages?.[0];
            return (
              <button key={t.id} onClick={() => openThread(t)} className={cn("group flex w-full items-center gap-2.5 border-b border-line px-4 py-3 text-left transition-colors", active?.id === t.id ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/60")}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  {(t.participantName || t.participantPhone).trim().charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-ink">{t.participantName || t.participantPhone}</span>
                    {t.unreadCount > 0 && <span className="shrink-0 rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white">{t.unreadCount}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-ink2">{last?.content ?? "대화를 시작하세요"}</p>
                </div>
                <span onClick={(e) => { e.stopPropagation(); removeThread(t); }} role="button" aria-label="대화 삭제" tabIndex={0} className="hidden shrink-0 rounded p-1 text-slate-400 hover:text-rose-500 group-hover:block"><Trash2 className="h-4 w-4" /></span>
              </button>
            );
          })}
          {!loading && threads.length === 0 && <p className="p-6 text-center text-xs text-slate-400">문자 내역이 없습니다.</p>}
        </div>
      </div>

      {/* 대화 뷰 */}
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        {active ? (
          <>
            <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line bg-card px-4">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                  {(active.participantName || active.participantPhone).trim().charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">{active.participantName || "이름 없음"}</div>
                  <div className="flex items-center gap-1 text-[10px] text-ink2"><Phone className="h-3 w-3" />{active.participantPhone}</div>
                </div>
              </div>
              <button onClick={() => setActive(null)} className="rounded-md p-1.5 text-slate-400 hover:text-ink lg:hidden" aria-label="닫기"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex", m.direction === "OUT" ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[70%] space-y-1", m.direction === "OUT" && "text-right")}>
                    <div className={cn("inline-block whitespace-pre-wrap rounded-2xl px-3 py-2 text-left text-xs leading-relaxed", m.direction === "OUT" ? "rounded-br-sm bg-blue-600 text-white" : "rounded-bl-sm border border-line bg-card text-ink")}>
                      {m.content}
                    </div>
                    {m.attachments.length > 0 && (
                      <div className={cn("flex gap-1.5", m.direction === "OUT" && "justify-end")}>
                        {m.attachments.map((a) => (
                          <a key={a} href={a} target="_blank" rel="noopener noreferrer">
                            <img src={a} alt="MMS 첨부" className="h-20 w-20 rounded-lg border border-line object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="text-[9px] text-ink2">{new Date(m.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <p className="py-10 text-center text-xs text-slate-400">첫 메시지를 보내보세요.</p>}
              <div ref={bottomRef} />
            </div>

            {/* 발송 컴포저 */}
            <div className="shrink-0 border-t border-line bg-card p-3">
              {attachments.length > 0 && (
                <div className="mb-2 flex gap-2">
                  {attachments.map((a) => (
                    <span key={a} className="relative inline-block">
                      <img src={a} alt="첨부" className="h-12 w-12 rounded-md border border-line object-cover" />
                      <button onClick={() => setAttachments((p) => p.filter((x) => x !== a))} className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-800 p-0.5 text-white" aria-label="첨부 제거"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <label className="shrink-0 cursor-pointer rounded-md border border-line p-2 text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="사진 첨부 (MMS)">
                  <Image className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAttachment(f); e.target.value = ""; }} />
                </label>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} placeholder="메시지 입력... (⌘+Enter 발송)" rows={1} className="max-h-28 min-h-[40px] flex-1 resize-none rounded-md border border-line bg-canvas px-3 py-2 text-xs focus:border-blue-500 focus:outline-none" />
                <button onClick={send} disabled={sending || !draft.trim()} className="shrink-0 rounded-md bg-blue-600 p-2.5 text-white hover:bg-blue-700 disabled:opacity-40" aria-label="발송">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <Smartphone className="h-12 w-12 text-slate-200 dark:text-slate-700" />
            <p className="text-sm text-ink2">대화를 선택하거나 새 문자를 작성하세요.</p>
            {showCompose && (
              <div className="w-full max-w-sm space-y-2 rounded-lg border border-line bg-card p-4 text-left">
                <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="수신번호 (예: 010-1234-5678) *" className="h-9 w-full rounded-md border border-line bg-canvas px-3 text-sm" />
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="이름 (선택)" className="h-9 w-full rounded-md border border-line bg-canvas px-3 text-sm" />
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="메시지 *" rows={2} className="w-full resize-none rounded-md border border-line bg-canvas px-3 py-2 text-sm" />
                <Button size="sm" className="w-full" onClick={startThread} disabled={!newPhone.trim() || !draft.trim() || sending}>{sending ? "발송 중..." : "발송"}</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
