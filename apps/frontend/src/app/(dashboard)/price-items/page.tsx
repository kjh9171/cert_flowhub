"use client";

// FlowHub 단가표 — 카테고리/묶음별 단가 검색, 인라인 수정, 발주노트 연동용

import React, { useEffect, useMemo, useState } from "react";
import { Tag, Search, Plus, Trash2, Check } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { PriceItem } from "@/types";

export default function PriceItemsPage() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ category: "", bundle: "", name: "", unitPrice: "0", note: "" });

  const load = async () => {
    try {
      const res = await api.get("/price-items", { params: { q: q || undefined, category: category || undefined } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch { setItems([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort((a, b) => a.localeCompare(b, "ko")), [items]);

  // 카테고리별 그룹
  const grouped = useMemo(() => {
    const map = new Map<string, PriceItem[]>();
    for (const it of items) {
      const arr = map.get(it.category) ?? [];
      arr.push(it);
      map.set(it.category, arr);
    }
    return [...map.entries()];
  }, [items]);

  const startEdit = (item: PriceItem) => { setEditingId(item.id); setEditValue(String(item.unitPrice)); };
  const commitEdit = async (item: PriceItem) => {
    const v = Number(editValue);
    setEditingId(null);
    if (!Number.isFinite(v) || v === item.unitPrice) return;
    try {
      await api.patch(`/price-items/${item.id}`, { unitPrice: v });
      await load();
    } catch { /* 롤백은 다음 로드에서 */ }
  };

  const addItem = async () => {
    if (!newItem.category.trim() || !newItem.name.trim()) return;
    try {
      await api.post("/price-items", { ...newItem, unitPrice: Number(newItem.unitPrice) || 0 });
      setNewItem({ category: newItem.category, bundle: "", name: "", unitPrice: "0", note: "" });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "등록 실패");
    }
  };

  const removeItem = async (item: PriceItem) => {
    if (!window.confirm(`"${item.name}" 단가를 삭제할까요?`)) return;
    await api.delete(`/price-items/${item.id}`);
    await load();
  };

  return (
    <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">단가표</h1>
            <p className="text-xs text-ink2">단가 셀 클릭 → 인라인 수정 (Enter 저장)</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}><Plus className="h-4 w-4" /> 단가 등록</Button>
      </div>

      {/* add form */}
      {showAdd && (
        <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            <input value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} placeholder="카테고리 *" className="h-9 rounded-md border border-line bg-canvas px-3 text-sm" list="price-categories" />
            <datalist id="price-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            <input value={newItem.bundle} onChange={(e) => setNewItem({ ...newItem, bundle: e.target.value })} placeholder="묶음 (선택)" className="h-9 rounded-md border border-line bg-canvas px-3 text-sm" />
            <input value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="품목명 *" className="h-9 rounded-md border border-line bg-canvas px-3 text-sm sm:col-span-2" />
            <input type="number" value={newItem.unitPrice} onChange={(e) => setNewItem({ ...newItem, unitPrice: e.target.value })} placeholder="단가" className="h-9 rounded-md border border-line bg-canvas px-3 text-sm tabular-nums" />
            <input value={newItem.note} onChange={(e) => setNewItem({ ...newItem, note: e.target.value })} placeholder="비고 (단위)" className="h-9 rounded-md border border-line bg-canvas px-3 text-sm" />
          </div>
          <div className="mt-2 flex justify-end"><Button size="sm" onClick={addItem}>등록</Button></div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="품목명 · 카테고리 · 묶음 검색..." className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border border-line bg-card px-3 text-sm text-ink">
          <option value="">카테고리 전체</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grouped tables */}
      <div className="space-y-4">
        {grouped.map(([cat, rows]) => (
          <div key={cat} className="overflow-hidden rounded-lg border border-line bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-line bg-slate-50 px-4 py-2 dark:bg-slate-800/60">
              <h2 className="text-sm font-semibold text-ink">{cat}</h2>
              <span className="text-xs text-ink2">{rows.length}개 항목</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] font-semibold uppercase tracking-wide text-ink2">
                <tr>
                  <th className="px-4 py-2">품목</th>
                  <th className="px-4 py-2 w-40">묶음</th>
                  <th className="px-4 py-2 w-40 text-right">단가</th>
                  <th className="px-4 py-2 w-24">비고</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id} className="border-t border-line hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-1.5 text-ink">{item.name}</td>
                    <td className="px-4 py-1.5 text-xs text-ink2">{item.bundle || "-"}</td>
                    <td className="px-4 py-1.5 text-right">
                      {editingId === item.id ? (
                        <span className="inline-flex items-center gap-1">
                          <input autoFocus type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => commitEdit(item)} onKeyDown={(e) => { if (e.key === "Enter") commitEdit(item); if (e.key === "Escape") setEditingId(null); }} className="h-7 w-28 rounded border border-blue-400 bg-canvas px-1.5 text-right tabular-nums focus:outline-none" />
                          <button onClick={() => commitEdit(item)} className="text-emerald-600" aria-label="저장"><Check className="h-4 w-4" /></button>
                        </span>
                      ) : (
                        <button onClick={() => startEdit(item)} className="tabular-nums text-ink underline decoration-dotted decoration-slate-300 underline-offset-2 hover:text-blue-600" title="클릭하여 단가 수정">
                          {item.unitPrice.toLocaleString()}원
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-1.5 text-xs text-ink2">{item.note || "-"}</td>
                    <td className="px-2 py-1.5 text-center"><button onClick={() => removeItem(item)} className="text-slate-300 hover:text-rose-500 dark:text-slate-600" aria-label="삭제"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {!loading && grouped.length === 0 && (
          <p className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-slate-400">단가 항목이 없습니다. "단가 등록"으로 추가하세요.</p>
        )}
      </div>
    </div>
  );
}
