"use client";

// FlowHub 발주노트 — 거래처 발주/회계/작업·도면 연결 + A4 인쇄

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Printer, Save, Trash2, ClipboardList, ChevronRight, AlertCircle } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErpSlideOver } from "@/components/erp/SlideOver";
import { OrderPrintSheet } from "@/components/erp/OrderPrintSheet";
import {
  orderStatusLabel, orderStatusColor, paymentStatusLabel, paymentStatusColor,
  won, dDayLabel, dDayTone,
} from "@/components/erp/labels";
import type { OrderNote, OrderItem, OrderStatus, PaymentStatus } from "@/types";

const EMPTY_ORDER: Partial<OrderNote> & { items: OrderItem[] } = {
  partnerName: "",
  partnerContact: "",
  status: "CONFIRMED",
  paymentStatus: "UNPAID",
  supplyAmount: 0,
  vatAmount: 0,
  totalAmount: 0,
  dueDate: "",
  memo: "",
  items: [{ name: "", spec: "", qty: 1, unit: "EA", unitPrice: 0 }],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [selected, setSelected] = useState<(Partial<OrderNote> & { items: OrderItem[] }) | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printOrder, setPrintOrder] = useState<OrderNote | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/orders", { params: { q: q || undefined, status: statusFilter || undefined, paymentStatus: paymentFilter || undefined } });
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, statusFilter, paymentFilter]);

  // 인쇄 트리거
  useEffect(() => {
    if (!printOrder) return;
    const t = setTimeout(() => window.print(), 150);
    return () => clearTimeout(t);
  }, [printOrder]);

  const unpaidTotal = useMemo(
    () => orders.filter((o) => o.paymentStatus === "UNPAID" && o.status !== "CANCELLED").reduce((s, o) => s + o.totalAmount, 0),
    [orders]
  );

  const openOrder = async (id: string) => {
    try {
      const res = await api.get(`/orders/${id}`);
      setSelected({ ...res.data, items: res.data.items ?? [] });
      setIsNew(false);
      setError("");
    } catch {
      setError("발주 정보를 불러오지 못했습니다.");
    }
  };

  const openNew = () => {
    setSelected({ ...EMPTY_ORDER, items: EMPTY_ORDER.items.map((i) => ({ ...i })) });
    setIsNew(true);
    setError("");
  };

  const totals = useMemo(() => {
    const items = selected?.items ?? [];
    const supply = items.reduce((s, it) => s + Math.round((Number(it.qty) || 0) * (Number(it.unitPrice) || 0)), 0);
    return { supply, vat: Math.round(supply * 0.1), total: supply + Math.round(supply * 0.1) };
  }, [selected?.items]);

  const patchItem = (idx: number, patch: Partial<OrderItem>) => {
    setSelected((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      return { ...prev, items };
    });
  };
  const addItem = () =>
    setSelected((prev) => prev && { ...prev, items: [...prev.items, { name: "", spec: "", qty: 1, unit: "EA", unitPrice: 0 }] });
  const removeItem = (idx: number) =>
    setSelected((prev) => prev && { ...prev, items: prev.items.filter((_, i) => i !== idx) });

  const save = async () => {
    if (!selected) return;
    if (!selected.partnerName?.trim()) { setError("거래처명은 필수입니다."); return; }
    setSaving(true);
    setError("");
    const payload = {
      partnerName: selected.partnerName?.trim(),
      partnerContact: selected.partnerContact || undefined,
      dueDate: selected.dueDate || undefined,
      memo: selected.memo || undefined,
      status: selected.status,
      paymentStatus: selected.paymentStatus,
      items: (selected.items || []).filter((it) => it.name.trim()).map((it) => ({
        name: it.name, spec: it.spec || undefined, qty: Number(it.qty) || 0,
        unit: it.unit || "EA", unitPrice: Number(it.unitPrice) || 0, note: it.note || undefined,
      })),
    };
    try {
      if (isNew) {
        const res = await api.post("/orders", payload);
        setSelected({ ...res.data, items: res.data.items ?? [] });
        setIsNew(false);
      } else if (selected.id) {
        const res = await api.patch(`/orders/${selected.id}`, payload);
        setSelected({ ...selected, ...res.data, items: res.data.items ?? [] });
      }
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "저장 실패");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!selected?.id) return;
    if (!window.confirm("이 발주노트를 삭제할까요? 되돌릴 수 없습니다.")) return;
    try {
      await api.delete(`/orders/${selected.id}`);
      setSelected(null);
      await load();
    } catch {
      setError("삭제 실패");
    }
  };

  const print = () => {
    if (!selected) return;
    setPrintOrder({
      ...(selected as OrderNote),
      supplyAmount: totals.supply,
      vatAmount: totals.vat,
      totalAmount: totals.total,
      items: selected.items.filter((i) => i.name.trim()),
    });
  };

  const close = () => setSelected(null);

  return (
    <div className="relative flex h-full">
      <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-ink">발주노트</h1>
              <p className="text-xs text-ink2">거래처 발주 · 회계 · 납기 관리 {unpaidTotal > 0 && <span className="ml-1 font-semibold text-rose-600 dark:text-rose-400">· 미수금 {won(unpaidTotal)}</span>}</p>
            </div>
          </div>
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" /> 새 발주</Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="발주번호 · 거래처 · 메모 검색..." className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-slate-400 focus:border-blue-500 focus:outline-none" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-line bg-card px-3 text-sm text-ink">
            <option value="">상태 전체</option>
            {Object.entries(orderStatusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="h-9 rounded-md border border-line bg-card px-3 text-sm text-ink">
            <option value="">결제 전체</option>
            {Object.entries(paymentStatusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-line bg-card shadow-sm">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-ink2">
              <tr>
                <th className="px-3 py-2.5">발주번호</th>
                <th className="px-3 py-2.5">거래처</th>
                <th className="px-3 py-2.5 text-right">품목</th>
                <th className="px-3 py-2.5 text-right">공급가</th>
                <th className="px-3 py-2.5">납기</th>
                <th className="px-3 py-2.5">상태</th>
                <th className="px-3 py-2.5">결제</th>
                <th className="px-3 py-2.5"><span className="sr-only">열기</span></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} onClick={() => openOrder(o.id)} className="cursor-pointer border-b border-line last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 font-mono text-[11px] font-semibold text-blue-600 dark:text-blue-400">{o.orderNo}</td>
                  <td className="px-3 py-2 font-medium text-ink">{o.partnerName}</td>
                  <td className="px-3 py-2 text-right text-ink2">{o.items?.length ?? 0}건</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{o.supplyAmount.toLocaleString()}</td>
                  <td className={cn("px-3 py-2 tabular-nums", dDayTone(o.dueDate))}>{dDayLabel(o.dueDate)}</td>
                  <td className="px-3 py-2"><span className={cn("inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold", orderStatusColor[o.status])}>{orderStatusLabel[o.status]}</span></td>
                  <td className="px-3 py-2"><span className={cn("inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold", paymentStatusColor[o.paymentStatus])}>{paymentStatusLabel[o.paymentStatus]}</span></td>
                  <td className="px-3 py-2 text-right text-slate-400"><ChevronRight className="ml-auto h-4 w-4" /></td>
                </tr>
              ))}
              {!loading && orders.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-slate-400">발주 내역이 없습니다. "새 발주"로 첫 발주를 등록하세요.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over detail */}
      <ErpSlideOver
        title={isNew ? "새 발주 등록" : selected?.orderNo ?? "발주 상세"}
        subtitle={isNew ? "거래처와 품목을 입력하세요" : selected?.partnerName}
        open={!!selected}
        onClose={close}
        actions={
          <>
            <button onClick={print} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200" title="A4 인쇄" aria-label="A4 인쇄">
              <Printer className="h-4 w-4" />
            </button>
            {!isNew && (
              <button onClick={remove} className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10" title="삭제" aria-label="삭제">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={save} disabled={saving} className="rounded-md bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-50" title="저장" aria-label="저장">
              <Save className="h-4 w-4" />
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            {error && <p className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <Input label="거래처명 *" value={selected.partnerName ?? ""} onChange={(e) => setSelected({ ...selected, partnerName: e.target.value })} placeholder="(주)한빛정밀" />
              <Input label="거래처 연락처" value={selected.partnerContact ?? ""} onChange={(e) => setSelected({ ...selected, partnerContact: e.target.value })} placeholder="02-3456-7890 (윤부장)" />
              <Input label="납기일" type="date" value={selected.dueDate ? String(selected.dueDate).slice(0, 10) : ""} onChange={(e) => setSelected({ ...selected, dueDate: e.target.value })} />
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink2">상태</label>
                <select value={selected.status} onChange={(e) => setSelected({ ...selected, status: e.target.value as OrderStatus })} className="h-9 rounded-md border border-line bg-card px-3 text-sm text-ink">
                  {Object.entries(orderStatusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink2">결제 상태</label>
                <select value={selected.paymentStatus} onChange={(e) => setSelected({ ...selected, paymentStatus: e.target.value as PaymentStatus })} className="h-9 rounded-md border border-line bg-card px-3 text-sm text-ink">
                  {Object.entries(paymentStatusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink2">연결 작업</label>
                <div className="flex h-9 items-center">
                  {selected.task ? (
                    <Link href="/tasks" className="truncate rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:underline dark:bg-blue-500/15 dark:text-blue-300">#{selected.task.title}</Link>
                  ) : <span className="text-xs text-ink2">없음</span>}
                </div>
              </div>
            </div>

            {/* 품목 편집 */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-ink">품목</label>
                <button onClick={addItem} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"><Plus className="h-3 w-3" />품목 추가</button>
              </div>
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full min-w-[440px] text-xs">
                  <thead className="bg-slate-50 text-left text-[10px] font-semibold text-ink2 dark:bg-slate-800/60">
                    <tr><th className="px-2 py-1.5">품명</th><th className="px-2 py-1.5">규격</th><th className="px-2 py-1.5 w-14">수량</th><th className="px-2 py-1.5 w-12">단위</th><th className="px-2 py-1.5 w-24 text-right">단가</th><th className="w-8"></th></tr>
                  </thead>
                  <tbody>
                    {selected.items.map((it, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-1 py-1"><input value={it.name} onChange={(e) => patchItem(i, { name: e.target.value })} placeholder="플레이트 40T" className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 focus:border-line focus:bg-canvas focus:outline-none" /></td>
                        <td className="px-1 py-1"><input value={it.spec ?? ""} onChange={(e) => patchItem(i, { spec: e.target.value })} placeholder="SS400" className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 focus:border-line focus:bg-canvas focus:outline-none" /></td>
                        <td className="px-1 py-1"><input type="number" min={0} value={it.qty} onChange={(e) => patchItem(i, { qty: Number(e.target.value) })} className="h-7 w-full rounded border border-transparent bg-transparent px-1 text-right tabular-nums focus:border-line focus:bg-canvas focus:outline-none" /></td>
                        <td className="px-1 py-1">
                          <select value={it.unit} onChange={(e) => patchItem(i, { unit: e.target.value })} className="h-7 w-full rounded bg-transparent text-xs focus:outline-none">
                            {["EA", "SET", "kg", "box", "m", "장"].map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className="px-1 py-1"><input type="number" min={0} value={it.unitPrice} onChange={(e) => patchItem(i, { unitPrice: Number(e.target.value) })} className="h-7 w-full rounded border border-transparent bg-transparent px-1.5 text-right tabular-nums focus:border-line focus:bg-canvas focus:outline-none" /></td>
                        <td className="px-1 py-1 text-center"><button onClick={() => removeItem(i)} className="text-slate-300 hover:text-rose-500 dark:text-slate-600" aria-label="품목 삭제">×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* 합계 */}
              <div className="mt-2 space-y-1 rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60">
                <div className="flex justify-between text-ink2"><span>공급가액</span><span className="tabular-nums text-ink">{won(totals.supply)}</span></div>
                <div className="flex justify-between text-ink2"><span>부가세 (10%)</span><span className="tabular-nums text-ink">{won(totals.vat)}</span></div>
                <div className="flex justify-between border-t border-line pt-1 text-sm font-bold text-ink"><span>합계</span><span className="tabular-nums text-blue-700 dark:text-blue-400">{won(totals.total)}</span></div>
              </div>
            </div>

            <Input label="메모" value={selected.memo ?? ""} onChange={(e) => setSelected({ ...selected, memo: e.target.value })} placeholder="납기 조건, 특이사항 등" />
          </div>
        )}
      </ErpSlideOver>

      {/* A4 인쇄 시트 */}
      <OrderPrintSheet order={printOrder} />
    </div>
  );
}
