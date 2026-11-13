"use client";

// FlowHub 통합주문 — 네이버 스마트스토어 · 쿠팡 미발송 주문 통합 관리
// 발송기한 D-Day, 선불/착불, 송장 일괄 등록, 픽업 주문서 A4 인쇄

import React, { useEffect, useMemo, useState } from "react";
import { Search, Truck, Printer, ShoppingCart, X } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { ErpSlideOver } from "@/components/erp/SlideOver";
import { marketPlatformLabel, marketOrderStatusLabel, marketOrderStatusColor, won, dDayLabel, dDayTone } from "@/components/erp/labels";
import type { MarketOrder, MarketPlatform, MarketOrderStatus } from "@/types";

export default function MarketOrdersPage() {
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [platform, setPlatform] = useState("");
  const [unshippedOnly, setUnshippedOnly] = useState(true);
  const [selected, setSelected] = useState<MarketOrder | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [trackingNo, setTrackingNo] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.get("/market-orders", {
        params: { q: q || undefined, platform: platform || undefined, unshippedOnly: unshippedOnly ? "true" : undefined },
      });
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch { setOrders([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, platform, unshippedOnly]);

  const toggleAll = () => setChecked((prev) => (prev.size === orders.length ? new Set() : new Set(orders.map((o) => o.id))));
  const toggleOne = (id: string) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const bulkShip = async () => {
    if (checked.size === 0) return;
    setBusy(true);
    try {
      await api.patch("/market-orders/bulk-ship", { ids: [...checked], trackingNo: trackingNo || undefined });
      setChecked(new Set());
      setBulkOpen(false);
      setTrackingNo("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const markDelivered = async (o: MarketOrder) => {
    await api.patch(`/market-orders/${o.id}`, { status: "DELIVERED" });
    await load();
  };

  const printTargets = useMemo(
    () => (checked.size ? orders.filter((o) => checked.has(o.id)) : orders),
    [checked, orders]
  );

  const printPickList = () => {
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return;
    const rows = printTargets.map((o, i) => `
      <tr>
        <td style="text-align:center">${i + 1}</td>
        <td>${marketPlatformLabel[o.platform]}<br/><small>${o.orderNo}</small></td>
        <td>${o.productName} × ${o.qty}</td>
        <td>${o.recipientName}<br/><small>${o.recipientAddress}${o.recipientPhone ? ` / ${o.recipientPhone}` : ""}</small></td>
        <td style="text-align:center">${o.isPrepaid ? "선불" : "착불"}</td>
        <td>${o.trackingNo || "-"}</td>
      </tr>`).join("");
    w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>픽업 주문서</title>
      <style>@page{size:A4;margin:14mm 12mm} body{font-family:"Pretendard","Malgun Gothic",sans-serif;color:#0f172a}
      h1{font-size:18px;border-bottom:3px double #0f172a;padding-bottom:8px} table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #94a3b8;padding:6px 8px;font-size:10pt;vertical-align:top} th{background:#f1f5f9}
      small{color:#475569}</style></head><body>
      <h1>픽업 주문서 (${new Date().toLocaleDateString("ko-KR")})</h1>
      <p>총 ${printTargets.length}건 · 선불 ${printTargets.filter(o=>o.isPrepaid).length}건 / 착불 ${printTargets.filter(o=>!o.isPrepaid).length}건</p>
      <table><thead><tr><th>No.</th><th>플랫폼/주문번호</th><th>상품/수량</th><th>수령인/주소</th><th>결제</th><th>송장</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="relative flex h-full">
      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">통합주문</h1>
              <p className="text-xs text-ink2">스마트스토어 · 쿠팡 미발송 주문 통합 관리 ({orders.length}건)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={printPickList}><Printer className="h-4 w-4" /> 픽업 주문서</Button>
            <Button size="sm" onClick={() => setBulkOpen(true)} disabled={checked.size === 0}>
              <Truck className="h-4 w-4" /> 송장 일괄 발송 {checked.size > 0 && `(${checked.size})`}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="상품명 · 주문번호 · 수령인 검색..." className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-slate-400 focus:border-blue-500 focus:outline-none" />
          </div>
          <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="h-9 rounded-md border border-line bg-card px-3 text-sm text-ink">
            <option value="">플랫폼 전체</option>
            {Object.entries(marketPlatformLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="flex h-9 cursor-pointer select-none items-center gap-1.5 rounded-md border border-line bg-card px-3 text-sm text-ink">
            <input type="checkbox" checked={unshippedOnly} onChange={(e) => setUnshippedOnly(e.target.checked)} className="h-4 w-4 accent-blue-600" />
            미발송만
          </label>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-line bg-card shadow-sm">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink2">
              <tr>
                <th className="px-3 py-2.5 w-8"><button onClick={toggleAll} className="text-ink2 hover:text-ink" aria-label="전체 선택"><input type="checkbox" readOnly checked={orders.length > 0 && checked.size === orders.length} className="h-4 w-4 accent-blue-600" /></button></th>
                <th className="px-3 py-2.5">플랫폼 / 주문번호</th>
                <th className="px-3 py-2.5">상품</th>
                <th className="px-3 py-2.5">수령인</th>
                <th className="px-3 py-2.5">결제</th>
                <th className="px-3 py-2.5 text-right">금액</th>
                <th className="px-3 py-2.5">발송기한</th>
                <th className="px-3 py-2.5">상태</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2"><input type="checkbox" checked={checked.has(o.id)} onChange={() => toggleOne(o.id)} className="h-4 w-4 accent-blue-600" aria-label="선택" /></td>
                  <td className="px-3 py-2">
                    <div className="text-xs font-semibold text-ink">{marketPlatformLabel[o.platform]}</div>
                    <button onClick={() => setSelected(o)} className="font-mono text-[11px] text-blue-600 hover:underline dark:text-blue-400">{o.orderNo}</button>
                  </td>
                  <td className="px-3 py-2 max-w-[220px]"><span className="line-clamp-2 text-xs text-ink">{o.productName} × {o.qty}</span></td>
                  <td className="px-3 py-2 text-xs text-ink2">{o.recipientName}</td>
                  <td className="px-3 py-2"><span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", o.isPrepaid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300")}>{o.isPrepaid ? "선불" : "착불"}</span></td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{won(o.price * o.qty)}</td>
                  <td className={cn("px-3 py-2 tabular-nums", dDayTone(o.dueDate))}>{dDayLabel(o.dueDate)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold", marketOrderStatusColor[o.status])}>{marketOrderStatusLabel[o.status]}</span>
                      {o.status === "SHIPPING" && (
                        <button onClick={() => markDelivered(o)} className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800" title="배송완료 처리">완료</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-400">조건에 맞는 주문이 없습니다. 미발송 주문이 전부 처리되었습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 주문 상세 */}
      <ErpSlideOver title={selected?.orderNo ?? ""} subtitle={selected ? marketPlatformLabel[selected.platform] : undefined} open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <dl className="space-y-3 text-sm">
            <div><dt className="text-xs text-ink2">상품</dt><dd className="font-medium text-ink">{selected.productName} × {selected.qty}개</dd></div>
            <div><dt className="text-xs text-ink2">수령인</dt><dd className="text-ink">{selected.recipientName} {selected.recipientPhone && <span className="text-ink2">({selected.recipientPhone})</span>}</dd><dd className="mt-0.5 whitespace-pre-wrap text-xs text-ink2">{selected.recipientAddress}</dd></div>
            <div className="grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-ink2">결제</dt><dd className="text-ink">{selected.isPrepaid ? "선불" : "착불"} · {won(selected.price * selected.qty)}</dd></div>
              <div><dt className="text-xs text-ink2">발송기한</dt><dd className={dDayTone(selected.dueDate)}>{dDayLabel(selected.dueDate)} ({selected.dueDate ? new Date(selected.dueDate).toLocaleDateString("ko-KR") : "미정"})</dd></div>
              <div><dt className="text-xs text-ink2">상태</dt><dd className="text-ink">{marketOrderStatusLabel[selected.status]}</dd></div>
              <div><dt className="text-xs text-ink2">송장</dt><dd className="font-mono text-ink">{selected.trackingNo || "미발송"}</dd></div>
            </div>
            <div><dt className="text-xs text-ink2">구매자</dt><dd className="text-ink">{selected.buyerName} {selected.buyerPhone && <span className="text-ink2">({selected.buyerPhone})</span>}</dd></div>
          </dl>
        )}
      </ErpSlideOver>

      {/* 일괄 발송 모달 */}
      {bulkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-lg bg-card p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">송장 일괄 발송 등록</h2>
              <button onClick={() => setBulkOpen(false)} className="text-slate-400 hover:text-ink"><X className="h-5 w-5" /></button>
            </div>
            <p className="mb-3 text-sm text-ink2">선택한 {checked.size}건을 "발송중"으로 변경합니다.</p>
            <input autoFocus value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} placeholder="송장번호 (선택, 택배사 공통)" className="h-9 w-full rounded-md border border-line bg-canvas px-3 text-sm focus:border-blue-500 focus:outline-none" />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setBulkOpen(false)}>취소</Button>
              <Button size="sm" onClick={bulkShip} disabled={busy}>{busy ? "처리 중..." : "일괄 발송 처리"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
