"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-lg font-semibold text-slate-900">문제가 발생했습니다</h2>
      <p className="text-sm text-slate-500">{error?.message || "알 수 없는 오류"}</p>
      <Button onClick={() => reset()}>다시 시도</Button>
    </div>
  );
}
