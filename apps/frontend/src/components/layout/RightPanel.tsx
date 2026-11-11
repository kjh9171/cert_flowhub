"use client";

// FlowHub Right Panel (슬라이드 상세 패널)

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/stores/layoutStore";

export function RightPanel() {
  const { rightPanelOpen, rightPanelContent, closeRightPanel } = useLayoutStore();

  if (!rightPanelOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-slate-900/20 lg:hidden"
        onClick={closeRightPanel}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-40 h-full w-full max-w-md border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:max-w-sm lg:shadow-none dark:border-slate-800 dark:bg-slate-900",
          rightPanelOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">상세</span>
          <button
            onClick={closeRightPanel}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[calc(100%-3.5rem)] overflow-y-auto p-4">
          {rightPanelContent || (
            <p className="text-sm text-slate-400">선택된 항목이 없습니다.</p>
          )}
        </div>
      </aside>
    </>
  );
}
