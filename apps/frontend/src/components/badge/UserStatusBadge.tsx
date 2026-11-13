"use client";

// FlowHub 사용자 상태 Badge

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn, userStatusLabel, userStatusColor } from "@/lib/utils";
import type { UserStatus } from "@/types";

interface UserStatusBadgeProps {
  status: UserStatus;
  showLabel?: boolean;
  size?: "sm" | "md";
  interactive?: boolean;
  onChange?: (s: UserStatus) => void;
}

const statuses: UserStatus[] = ["ONLINE", "AWAY", "BUSY", "OFFLINE"];

export function UserStatusBadge({
  status,
  showLabel = true,
  size = "md",
  interactive = false,
  onChange,
}: UserStatusBadgeProps) {
  const [open, setOpen] = useState(false);

  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  if (!interactive) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className={cn("rounded-full", dotSize, userStatusColor[status])} />
        {showLabel && <span className="text-xs text-slate-600 dark:text-slate-400">{userStatusLabel[status]}</span>}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <span className={cn("rounded-full", dotSize, userStatusColor[status])} />
        {showLabel && userStatusLabel[status]}
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1 shadow-md">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange?.(s);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800"
            >
              <span className={cn("h-2 w-2 rounded-full", userStatusColor[s])} />
              {userStatusLabel[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
