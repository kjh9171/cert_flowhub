// ERP 도메인 라벨/컬러 상수 (한국어)

import type { OrderStatus, PaymentStatus, MarketOrderStatus, MarketPlatform } from "@/types";

export const orderStatusLabel: Record<OrderStatus, string> = {
  CONFIRMED: "접수",
  IN_PRODUCTION: "생산중",
  READY: "준비완료",
  SHIPPED: "발송",
  DELIVERED: "납품완료",
  CANCELLED: "취소",
};
export const orderStatusColor: Record<OrderStatus, string> = {
  CONFIRMED: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  IN_PRODUCTION: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  READY: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SHIPPED: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
  DELIVERED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-500/15 dark:text-green-300 dark:border-green-500/30",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-700",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  UNPAID: "미수금",
  PARTIAL: "일부수령",
  PAID: "입금완료",
  REFUNDED: "환불",
};
export const paymentStatusColor: Record<PaymentStatus, string> = {
  UNPAID: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  PARTIAL: "bg-amber-100 text-amber-700 border-amber-200",
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REFUNDED: "bg-slate-100 text-slate-500 border-slate-200",
};

export const marketPlatformLabel: Record<MarketPlatform, string> = {
  SMARTSTORE: "스마트스토어",
  COUPANG: "쿠팡",
  OTHER: "기타",
};

export const marketOrderStatusLabel: Record<MarketOrderStatus, string> = {
  PENDING: "신규(미발송)",
  PREPARING: "배송준비",
  SHIPPING: "발송중",
  DELIVERED: "배송완료",
  CANCELLED: "취소",
};
export const marketOrderStatusColor: Record<MarketOrderStatus, string> = {
  PENDING: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  PREPARING: "bg-amber-100 text-amber-700 border-amber-200",
  SHIPPING: "bg-blue-100 text-blue-700 border-blue-200",
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

export const won = (n: number) => `${(n ?? 0).toLocaleString()}원`;
export const wonShort = (n: number) => `${(n ?? 0).toLocaleString()}`;

/** 납기까지 D-Day (양수: 남은 일수, 음수: 초과 일수, 0: 당일) */
export function dDay(dateLike?: string | Date | null): number | null {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function dDayLabel(dateLike?: string | Date | null): string {
  const dd = dDay(dateLike);
  if (dd === null) return "-";
  if (dd === 0) return "오늘";
  return dd > 0 ? `D-${dd}` : `D+${Math.abs(dd)}`;
}

export function dDayTone(dateLike?: string | Date | null): string {
  const dd = dDay(dateLike);
  if (dd === null) return "text-ink2";
  if (dd < 0) return "text-rose-600 dark:text-rose-400 font-bold";
  if (dd <= 2) return "text-amber-600 dark:text-amber-400 font-semibold";
  return "text-ink2";
}
