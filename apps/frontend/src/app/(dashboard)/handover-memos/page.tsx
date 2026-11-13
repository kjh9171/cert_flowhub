"use client";

// FlowHub 전달사항 — 담당자 할 일 메모 + @발주노트 멘션 자동완성 + 사진 첨부

import React, { useEffect, useRef, useState } from "react";
import { Megaphone, Check, Trash2, Paperclip, X, ClipboardList } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { HandoverMemo, OrderNote } from "@/types";

export default function HandoverMemosPage() {
  const [memos, setMemos] = useState<HandoverMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [orderNoteId, setOrderNoteId] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  // @멘션 자동완성
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [orderOptions, setOrderOptions] = useState<OrderNote[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = async () => {
    try {
      const res = await api.get("/handover-memos");
      setMemos(Array.isArray(res.data) ? res.data : []);
    } catch { setMemos([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const loadOrderOptions = async (q: string) => {
    try {
      const res = await api.get("/orders", { params: { q: q || undefined } });
      setOrderOptions(Array.isArray(res.data) ? res.data.slice(0, 6) : []);
    } catch { setOrderOptions([]); }
  };

  const onContentChange = (value: string) => {
    setContent(value);
    // 마지막 '@' 뒤 토큰으로 멘션 후보 탐지
    const m = /@([^\s@]{0,30})$/.exec(value);
    if (m) {
      setMentionQuery(m[1]);
      setMentionOpen(true);
      setMentionIndex(0);
      loadOrderOptions(m[1]);
    } else {
      setMentionOpen(false);
    }
  };

  const applyMention = (order: OrderNote) => {
    setContent((prev) => prev.replace(/@[^\s@]{0,30}$/, `@${order.orderNo} `));
    setOrderNoteId(order.id);
    setMentionOpen(false);
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionOpen || orderOptions.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setMentionIndex((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + orderOptions.length) % orderOptions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applyMention(orderOptions[mentionIndex]);
    } else if (e.key === "Escape") {
      setMentionOpen(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setPhotos((p) => [...p, res.data.fileUrl]);
    } catch {
      alert("사진 업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!content.trim()) return;
    try {
      await api.post("/handover-memos", { content: content.trim(), photos, orderNoteId });
      setContent("");
      setPhotos([]);
      setOrderNoteId(undefined);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "저장 실패");
    }
  };

  const toggleDone = async (memo: HandoverMemo) => {
    await api.patch(`/handover-memos/${memo.id}`, { done: !memo.done });
    await load();
  };

  const remove = async (memo: HandoverMemo) => {
    if (!window.confirm("이 전달사항을 삭제할까요?")) return;
    await api.delete(`/handover-memos/${memo.id}`);
    await load();
  };

  const doneCount = memos.filter((m) => m.done).length;

  return (
    <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
          <Megaphone className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">전달사항</h1>
          <p className="text-xs text-ink2">{memos.length}건 중 {doneCount}건 완료 · @로 발주노트 연결 · 사진 첨부 가능</p>
        </div>
      </div>

      {/* Composer */}
      <div className="relative rounded-lg border border-line bg-card p-3 shadow-sm">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="전달사항을 입력하세요... ('@'를 입력하면 발주노트가 연결됩니다)"
          rows={3}
          className="w-full resize-none border-0 bg-transparent text-sm text-ink placeholder:text-slate-400 focus:outline-none"
        />
        {/* @멘션 드롭다운 */}
        {mentionOpen && orderOptions.length > 0 && (
          <div className="absolute left-3 z-20 mt-1 w-80 overflow-hidden rounded-md border border-line bg-card shadow-lg">
            <div className="border-b border-line px-3 py-1.5 text-[10px] font-semibold uppercase text-ink2">발주노트 연결 — ↑↓ 선택, Enter 삽입</div>
            {orderOptions.map((o, i) => (
              <button
                key={o.id}
                onClick={() => applyMention(o)}
                onMouseEnter={() => setMentionIndex(i)}
                className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-xs", i === mentionIndex ? "bg-blue-50 dark:bg-blue-500/10" : "")}
              >
                <ClipboardList className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{o.orderNo}</span>
                <span className="truncate text-ink">{o.partnerName}</span>
              </button>
            ))}
          </div>
        )}
        {/* 첨부 썸네일 */}
        {photos.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {photos.map((p) => (
              <span key={p} className="relative inline-block">
                <img src={p} alt="첨부" className="h-16 w-16 rounded-md border border-line object-cover" />
                <button onClick={() => setPhotos((prev) => prev.filter((x) => x !== p))} className="absolute -right-1.5 -top-1.5 rounded-full bg-slate-800 p-0.5 text-white" aria-label="첨부 제거"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
          <label className={cn("flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800", uploading && "opacity-50")}>
            <Paperclip className="h-4 w-4" /> {uploading ? "업로드 중..." : "사진 첨부"}
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ""; }} />
          </label>
          {orderNoteId && <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">발주노트 연결됨</span>}
          <Button size="sm" onClick={submit} disabled={!content.trim()}>등록</Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {memos.map((memo) => (
          <div key={memo.id} className={cn("flex items-start gap-3 rounded-lg border border-line bg-card p-3 shadow-sm transition-opacity", memo.done && "opacity-60")}>
            <button
              onClick={() => toggleDone(memo)}
              aria-pressed={memo.done}
              aria-label={memo.done ? "미완료로 변경" : "완료로 변경"}
              className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border", memo.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-slate-600")}
            >
              {memo.done && <Check className="h-3.5 w-3.5" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={cn("whitespace-pre-wrap text-sm text-ink", memo.done && "line-through decoration-slate-400")}>{memo.content}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-ink2">
                <span>{memo.author?.name}</span>
                <span>·</span>
                <span>{new Date(memo.createdAt).toLocaleString("ko-KR")}</span>
                {memo.orderNote && (
                  <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                    {memo.orderNote.orderNo} {memo.orderNote.partnerName}
                  </span>
                )}
              </div>
              {memo.photos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {memo.photos.map((p) => (
                    <a key={p} href={p} target="_blank" rel="noopener noreferrer">
                      <img src={p} alt="첨부 사진" className="h-20 w-20 rounded-md border border-line object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => remove(memo)} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10" aria-label="삭제"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {!loading && memos.length === 0 && (
          <p className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-slate-400">전달사항이 없습니다. 위 입력창에 첫 메모를 남겨보세요.</p>
        )}
      </div>
    </div>
  );
}
