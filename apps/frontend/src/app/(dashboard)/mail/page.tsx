"use client";

// FlowHub 메일 — 받은편지함 자동 라벨링(미처리/거래처/세금계산서) + 원클릭 발주 전환

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Search, Trash2, MailOpen, ClipboardList, Inbox, X } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { BusinessEmail, EmailClassification } from "@/types";

const clsLabel: Record<EmailClassification, string> = {
  UNHANDLED: "미처리",
  VENDOR: "거래처",
  TAX_INVOICE: "세금계산서",
  OTHER: "기타",
};
const clsColor: Record<EmailClassification, string> = {
  UNHANDLED: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  VENDOR: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  TAX_INVOICE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  OTHER: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function MailPage() {
  const router = useRouter();
  const [emails, setEmails] = useState<BusinessEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [classification, setClassification] = useState<EmailClassification | "">("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<BusinessEmail | null>(null);
  const [converting, setConverting] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/emails", { params: { q: q || undefined, classification: classification || undefined, unreadOnly: unreadOnly ? "true" : undefined } });
      setEmails(Array.isArray(res.data) ? res.data : []);
    } catch { setEmails([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, classification, unreadOnly]);

  const openEmail = async (email: BusinessEmail) => {
    setSelected(email);
    if (!email.isRead) {
      try {
        await api.patch(`/emails/${email.id}`, { isRead: true });
        setEmails((prev) => prev.map((x) => (x.id === email.id ? { ...x, isRead: true } : x)));
        setSelected({ ...email, isRead: true });
      } catch { /* 무시 */ }
    }
  };

  const reclassify = async (email: BusinessEmail, c: EmailClassification) => {
    try {
      const res = await api.patch(`/emails/${email.id}`, { classification: c });
      setEmails((prev) => prev.map((x) => (x.id === email.id ? { ...x, ...res.data } : x)));
      if (selected?.id === email.id) setSelected({ ...selected, ...res.data });
    } catch { /* 무시 */ }
  };

  const convertToOrder = async (email: BusinessEmail) => {
    setConverting(true);
    try {
      await api.post(`/emails/${email.id}/to-order`, {});
      // 발주노트 페이지로 이동 (새 발주가 목록 최상단에 표시됨)
      router.push("/orders");
    } catch (e: any) {
      alert(e?.response?.data?.message || "발주 전환 실패");
    } finally {
      setConverting(false);
    }
  };

  const remove = async (email: BusinessEmail) => {
    if (!window.confirm("이 메일을 삭제할까요?")) return;
    await api.delete(`/emails/${email.id}`);
    if (selected?.id === email.id) setSelected(null);
    await load();
  };

  const unreadCount = emails.filter((e) => !e.isRead).length;

  return (
    <div className="relative flex h-full">
      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">메일</h1>
              <p className="text-xs text-ink2">자동 라벨링 {unreadCount > 0 && <span className="font-semibold text-rose-600 dark:text-rose-400">· 미처리 {unreadCount}건</span>}</p>
            </div>
          </div>
          <label className="flex h-9 cursor-pointer select-none items-center gap-1.5 rounded-md border border-line bg-card px-3 text-sm text-ink">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="h-4 w-4 accent-blue-600" />
            안읽은 메일만
          </label>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제목 · 보낸사람 검색..." className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => setClassification("")} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", classification === "" ? "border-blue-500 bg-blue-600 text-white" : "border-line bg-card text-ink2")}>전체</button>
            {Object.entries(clsLabel).map(([k, v]) => (
              <button key={k} onClick={() => setClassification(k as EmailClassification)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium", classification === k ? "border-blue-500 bg-blue-600 text-white" : cn("border-line bg-card text-ink2"))}>{v}</button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto rounded-lg border border-line bg-card shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink2">
              <tr><th className="px-3 py-2.5 w-8"></th><th className="px-3 py-2.5">보낸사람</th><th className="px-3 py-2.5">제목</th><th className="px-3 py-2.5">분류</th><th className="px-3 py-2.5">수신</th><th className="w-12"></th></tr>
            </thead>
            <tbody>
              {emails.map((e) => (
                <tr key={e.id} onClick={() => openEmail(e)} className={cn("cursor-pointer border-b border-line last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50", !e.isRead && "bg-blue-50/50 dark:bg-blue-500/5")}>
                  <td className="px-3 py-2">{!e.isRead ? <span className="block h-2 w-2 rounded-full bg-blue-500" /> : <MailOpen className="h-4 w-4 text-slate-300 dark:text-slate-600" />}</td>
                  <td className="px-3 py-2"><div className="text-xs font-semibold text-ink">{e.fromName}</div><div className="text-[10px] text-ink2">{e.fromEmail}</div></td>
                  <td className="px-3 py-2 max-w-[340px]"><span className={cn("line-clamp-1 text-xs", !e.isRead ? "font-semibold text-ink" : "text-ink2")}>{e.subject}</span></td>
                  <td className="px-3 py-2"><span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold", clsColor[e.classification])}>{clsLabel[e.classification]}</span></td>
                  <td className="px-3 py-2 text-[11px] tabular-nums text-ink2">{new Date(e.receivedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</td>
                  <td className="px-3 py-2"><button onClick={(ev) => { ev.stopPropagation(); remove(e); }} className="rounded-md p-1.5 text-slate-400 hover:text-rose-500" aria-label="삭제"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
              {!loading && emails.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center"><Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" /><p className="text-sm text-slate-400">메일이 없습니다.</p></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 메일 상세 */}
      {selected && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={() => setSelected(null)}>
          <div className="flex h-full w-full max-w-lg flex-col bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold leading-snug text-ink">{selected.subject}</h2>
                  <p className="mt-1 text-xs text-ink2">{selected.fromName} &lt;{selected.fromEmail}&gt; · {new Date(selected.receivedAt).toLocaleString("ko-KR")}</p>
                </div>
                <button onClick={() => setSelected(null)} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800" aria-label="닫기"><X className="h-5 w-5" /></button>
              </div>
              {/* 분류 변경 */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {Object.entries(clsLabel).map(([k, v]) => (
                  <button key={k} onClick={() => reclassify(selected, k as EmailClassification)} className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold", selected.classification === k ? clsColor[k as EmailClassification] : "border-line text-ink2")}>{v}</button>
                ))}
                <button onClick={() => convertToOrder(selected)} disabled={converting} className="ml-auto flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  <ClipboardList className="h-3.5 w-3.5" /> {converting ? "전환 중..." : "발주로 전환"}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{selected.snippet || "(본문 미리보기 없음)"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
