import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-6xl font-bold text-slate-300">404</h1>
      <p className="text-slate-500 dark:text-slate-400">페이지를 찾을 수 없습니다.</p>
      <Link href="/">
        <Button>대시보드로 이동</Button>
      </Link>
    </div>
  );
}
