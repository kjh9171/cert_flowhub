import React from "react";
import Link from "next/link";

export default function GlobalNotFound() {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <h1 className="text-6xl font-bold text-slate-300">404</h1>
        <p className="text-slate-500">페이지를 찾을 수 없습니다.</p>
        <a href="/" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          홈으로
        </a>
      </body>
    </html>
  );
}
