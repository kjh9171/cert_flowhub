"use client";

// ERP 상세 슬라이드오버 — 페이지 이동 없이 우측에서 편집
// (모바일 전면, 데스크톱 480px)

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ErpSlideOverProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  open: boolean;
  onClose: () => void;
  /** 상단 오른쪽 액션 버튼들 */
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: string;
}

export function ErpSlideOver({ title, subtitle, open, onClose, actions, children, width = "max-w-[520px]" }: ErpSlideOverProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "상세"}
        className={`fixed inset-y-0 right-0 z-40 flex w-full ${width} flex-col border-l border-line bg-card shadow-2xl lg:absolute lg:z-20`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">{title}</div>
            {subtitle && <div className="truncate text-[11px] text-ink2">{subtitle}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300" aria-label="닫기">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}
