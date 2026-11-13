"use client";

// FlowHub 연동 상태 Badge

import React from "react";
import { GitCommit, GitPullRequest, Activity, Rocket, Plug, ExternalLink } from "lucide-react";
import { cn, integrationStatusLabel, integrationStatusColor } from "@/lib/utils";
import type { IntegrationBadge as IBadge, IntegrationEventType, IntegrationStatus } from "@/types";

const eventIcon: Record<IntegrationEventType, React.ComponentType<{ className?: string }>> = {
  COMMIT: GitCommit,
  PULL_REQUEST: GitPullRequest,
  CI_CD: Activity,
  DEPLOY: Rocket,
  EXTERNAL_API: Plug,
};

interface IntegrationBadgeProps {
  badge?: IBadge;
  status?: IntegrationStatus;
  eventType?: IntegrationEventType;
  title?: string;
  targetUrl?: string;
  size?: "sm" | "md";
  className?: string;
}

export function IntegrationBadge({
  badge,
  status,
  eventType,
  title,
  targetUrl,
  size = "md",
  className,
}: IntegrationBadgeProps) {
  const st = badge?.status ?? status ?? "PENDING";
  const et = badge?.eventType ?? eventType ?? "EXTERNAL_API";
  const ttl = badge?.title ?? title ?? "연동";
  const url = badge?.targetUrl ?? targetUrl;
  const Icon = eventIcon[et];

  const isProgress = st === "IN_PROGRESS";

  const wrapper =
    size === "sm"
      ? "px-2 py-0.5 text-[11px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";

  const content = (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full font-medium border",
        wrapper,
        st === "SUCCESS" && "border-green-200 bg-green-50 text-green-700",
        st === "IN_PROGRESS" && "border-blue-200 bg-blue-50 text-blue-700",
        st === "FAILED" && "border-red-200 bg-red-50 text-red-700",
        st === "PENDING" && "border-slate-200 dark:border-slate-800 bg-slate-50 text-slate-600 dark:text-slate-400",
        className
      )}
    >
      <Icon className={cn("shrink-0", size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5", isProgress && "animate-pulse")} />
      <span className="truncate max-w-[120px]">{ttl}</span>
      {isProgress && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
      )}
      {url && <ExternalLink className="h-3 w-3 opacity-60" />}
    </span>
  );

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block">
        {content}
      </a>
    );
  }
  return content;
}
