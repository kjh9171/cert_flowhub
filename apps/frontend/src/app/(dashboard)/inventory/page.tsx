"use client";

// FlowHub 재고관리 — 원자재/제품 재고 즉시 조정, 안전재고 미만 필터, 변경 이력

import React, { useEffect, useState } from "react";
import { Package, Search, Minus, Plus, AlertTriangle, History, X, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { InventoryItem } from "@/types";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | "RAW" | "PRODUCT">("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [delta, setDelta] = useState("1");
  const [historyOf, setHistoryOf] = useState<InventoryItem | null>(null);
  const [logs, setLogs] = useState<Array<{ id: string; delta: number; after: number; reason?: string | null; createdAt: string }>>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", sku: "", kind: "PRODUCT" as "RAW" | "PRODUCT", unit: "EA", qty: "0", safetyQty: "0" });

  const load = async () => {
    try {
      const res = await api.get("/inventory", { params: { q: q || undefined, kind: kind || undefined, lowStockOnly: lowStockOnly ? "true" : undefined } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch { setItems([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, kind, lowStockOnly]);

  const adjust = async (item: InventoryItem, sign: 1 | -1) => {
    const d = Number(delta) * sign;
    if (!Number.isFinite(d) || d === 0) return;
    setAdjusting(item.id);
    try {
      await api.post(`/inventory/${item.id}/adjust`, { delta: d, reason: "수동 조정 (화면)" });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "조정 실패");
    } finally {
      setAdjusting(null);
    }
  };

  const openHistory = async (item: InventoryItem) => {
    setHistoryOf(item);
    try {
      const res = await api.get(`/inventory/${item.id}/logs`);
      setLogs(Array.isArray(res.data) ? res.data : []);
    } catch { setLogs([]); }
  };

  const addItem = async () => {
    if (!newItem.name.trim()) return;
    try {
      await api.post("/inventory", { ...newItem, qty: Number(newItem.qty), safetyQty: Number(newItem.safetyQty) });
      setShowAdd(false);
      setNewItem({ name: "", sku: "", kind: "PRODUCT", unit: "EA", qty: "0", safetyQty: "0" });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "등록 실패");
    }
  };

  const removeItem = async (item: InventoryItem) => {
    if (!window.confirm(`"${item.name}" 재고를 삭제할까요?`)) return;
    await api.delete(`/inventory/${item.id}`);
    await load();
  };

  const lowCount = items.filter((i) => i.qty <= i.safetyQty).length;

  return (
    <div className="relative flex h-full">
      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">재고관리</h1>
              <p className="text-xs text-ink2">원자재/제품 재고 {lowCount > 0 && <span className="font-semibold text-rose-600 dark:text-rose-400">· 부족 {lowCount}건</span>}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowAdd((v) => !v)}><Plus className="h-4 w-4" /> 품목 등록</Button>
        </div>

        {/* add form */}
        {showAdd && (
          <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
              <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="품목명 *" className="h-9 rounded-md border border-line bg-canvas px-3 text-sm sm:col-span-2" />
              <input value={newItem.sku} onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })} placeholder="코드(SKU)" className="h-9 rounded-md border border-line bg-canvas px-3 text-sm" />
              <select value={newItem.kind} onChange={(e) => setNewItem({ ...newItem, kind: e.target.value as any })} className="h-9 rounded-md border border-line bg-canvas px-3 text-sm">
                <option value="PRODUCT">제품</option>
                <option value="RAW">원자재</option>
              </select>
              <input value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} placeholder="단위" className="h-9 rounded-md border border-line bg-canvas px-3 text-sm" />
              <input type="number" value={newItem.qty} onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })} placeholder="현재고" className="h-9 rounded-md border border-line bg-canvas px-3 text-sm tabular-nums" />
              <input type="number" value={newItem.safetyQty} onChange={(e) => setNewItem({ ...newItem, safetyQty: e.target.value })} placeholder="안전재고" className="h-9 rounded-md border border-line bg-canvas px-3 text-sm tabular-nums" />
            </div>
            <div className="mt-2 flex justify-end"><Button size="sm" onClick={addItem}>등록</Button></div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="품목명 검색..." className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div className="inline-flex rounded-md border border-line bg-card p-0.5 text-xs font-medium">
            {([["", "전체"], ["PRODUCT", "제품"], ["RAW", "원자재"]] as const).map(([k, v]) => (
              <button key={k} onClick={() => setKind(k as any)} className={cn("rounded px-3 py-1.5", kind === k ? "bg-blue-600 text-white" : "text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800")}>{v}</button>
            ))}
          </div>
          <button onClick={() => setLowStockOnly((v) => !v)} aria-pressed={lowStockOnly} className={cn("flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors", lowStockOnly ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300" : "border-line bg-card text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800")}>
            <AlertTriangle className="h-4 w-4" /> 부족 재고만 보기
          </button>
          <div className="flex items-center gap-1 text-xs text-ink2">
            조정량
            <input type="number" min={1} value={delta} onChange={(e) => setDelta(e.target.value)} className="h-9 w-16 rounded-md border border-line bg-canvas px-2 text-center tabular-nums" aria-label="조정량" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-line bg-card shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink2">
              <tr>
                <th className="px-3 py-2.5">코드</th>
                <th className="px-3 py-2.5">품목명</th>
                <th className="px-3 py-2.5">구분</th>
                <th className="px-3 py-2.5 text-right">현재고</th>
                <th className="px-3 py-2.5 text-right">안전재고</th>
                <th className="px-3 py-2.5 text-center">즉시 조정</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const low = item.qty <= item.safetyQty;
                return (
                  <tr key={item.id} className={cn("border-b border-line last:border-0", low && "bg-rose-50/50 dark:bg-rose-500/5")}>
                    <td className="px-3 py-2 font-mono text-[11px] text-ink2">{item.sku || "-"}</td>
                    <td className="px-3 py-2 font-medium text-ink">{item.name}{low && <span className="ml-1.5 align-middle text-[10px] font-bold text-rose-600 dark:text-rose-400">부족</span>}</td>
                    <td className="px-3 py-2 text-xs text-ink2">{item.kind === "RAW" ? "원자재" : "제품"}</td>
                    <td className={cn("px-3 py-2 text-right tabular-nums font-semibold", low ? "text-rose-600 dark:text-rose-400" : "text-ink")}>{item.qty.toLocaleString()} {item.unit}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink2">{item.safetyQty.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => adjust(item, -1)} disabled={adjusting === item.id} className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-canvas text-ink hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" aria-label="출고"><Minus className="h-3.5 w-3.5" /></button>
                        <button onClick={() => adjust(item, 1)} disabled={adjusting === item.id} className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-canvas text-ink hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800" aria-label="입고"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openHistory(item)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-800" title="변경 이력" aria-label="변경 이력"><History className="h-4 w-4" /></button>
                        <button onClick={() => removeItem(item)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10" title="삭제" aria-label="삭제"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-slate-400">{lowStockOnly ? "부족 재고가 없습니다. 재고가 안전합니다." : "재고 품목이 없습니다."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 변경 이력 슬라이드오버 */}
      {historyOf && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={() => setHistoryOf(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">{historyOf.name} — 재고 이력</h2>
              <button onClick={() => setHistoryOf(null)} className="rounded-md p-1 text-slate-400 hover:text-ink" aria-label="닫기"><X className="h-5 w-5" /></button>
            </div>
            <ol className="space-y-2 text-sm">
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2">
                  <div>
                    <span className={cn("font-mono font-semibold tabular-nums", l.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{l.delta >= 0 ? "+" : ""}{l.delta}</span>
                    <span className="ml-2 text-xs text-ink2">{l.reason || "-"}</span>
                  </div>
                  <div className="text-right">
                    <div className="tabular-nums text-ink">잔고 {l.after}</div>
                    <div className="text-[10px] text-ink2">{new Date(l.createdAt).toLocaleString("ko-KR")}</div>
                  </div>
                </li>
              ))}
              {logs.length === 0 && <li className="py-8 text-center text-sm text-slate-400">이력이 없습니다.</li>}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
