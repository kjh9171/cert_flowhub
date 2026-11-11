// FlowHub Badge 컴포넌트

import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  color?: string; // tailwind classes
  className?: string;
  dot?: boolean;
  dotColor?: string;
}

export function Badge({ children, color = "bg-slate-100 text-slate-700", className, dot, dotColor }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium dark:opacity-90",
        color,
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColor || "bg-current")} />}
      {children}
    </span>
  );
}
