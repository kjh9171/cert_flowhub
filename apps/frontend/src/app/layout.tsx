import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "FlowHub - 통합 협업 플랫폼",
  description: "개인 일정, 프로젝트/작업 배분, 팀 협업, 지식 베이스를 하나로",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-[#090d16] dark:text-slate-100">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
