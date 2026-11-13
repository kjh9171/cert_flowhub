"use client";

// FlowHub 영업 키워드 트래커 — 블로그 키워드 순위 추이 + 순위 변동 기반 포스팅 추천

import React, { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Plus, Lightbulb } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { KeywordRankSummary, KeywordRecommendation } from "@/types";

interface HistoryPoint { position: number; trackedAt: string }

export default function KeywordsPage() {
  const [summary, setSummary] = useState<KeywordRankSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [recommend, setRecommend] = useState<KeywordRecommendation[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newKw, setNewKw] = useState("");
  const [newPos, setNewPos] = useState("");

  const load = async () => {
    try {
      const [s, r] = await Promise.all([
        api.get("/keywords"),
        api.get("/keywords/recommend").catch(() => ({ data: { suggestions: [] } })),
      ]);
      const list: KeywordRankSummary[] = Array.isArray(s.data) ? s.data : [];
      setSummary(list);
      setRecommend(Array.isArray(r.data?.suggestions) ? r.data.suggestions : []);
      if (!selected && list.length) setSelected(list[0].keyword);
    } catch { setSummary([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        const res = await api.get("/keywords/history", { params: { keyword: selected } });
        setHistory(Array.isArray(res.data) ? res.data.map((x: any) => ({ position: x.position, trackedAt: x.trackedAt })) : []);
      } catch { setHistory([]); }
    })();
  }, [selected]);

  const track = async () => {
    const pos = Number(newPos);
    if (!newKw.trim() || !Number.isFinite(pos)) return;
    try {
      await api.post("/keywords/track", { keyword: newKw.trim(), position: pos });
      setNewKw(""); setNewPos("");
      setShowAdd(false);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || "기록 실패");
    }
  };

  // SVG 추이 라인
  const chart = useMemo(() => {
    if (history.length < 2) return null;
    const W = 640, H = 160, PAD = 28;
    const positions = history.map((h) => h.position);
    const min = Math.min(...positions), max = Math.max(...positions);
    const span = Math.max(max - min, 1);
    const x = (i: number) => PAD + (i * (W - PAD * 2)) / (history.length - 1);
    const y = (p: number) => H - PAD - ((p - min) / span) * (H - PAD * 2); // 낮은 순위(숫자 큼)는 아래
    const points = history.map((h, i) => `${x(i)},${y(h.position)}`).join(" ");
    return { W, H, PAD, min, max, points, labels: history.map((h) => new Date(h.trackedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })) };
  }, [history]);

  return (
    <div className="min-w-0 flex-1 space-y-4 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink">영업 키워드</h1>
            <p className="text-xs text-ink2">블로그 키워드 노출 순위 · 낮은 숫자가 상위 노출</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}><Plus className="h-4 w-4" /> 순위 기록</Button>
      </div>

      {/* add form */}
      {showAdd && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-card p-4 shadow-sm">
          <input value={newKw} onChange={(e) => setNewKw(e.target.value)} placeholder="키워드 (예: 레이저절단)" className="h-9 min-w-[200px] flex-1 rounded-md border border-line bg-canvas px-3 text-sm" />
          <input type="number" min={1} value={newPos} onChange={(e) => setNewPos(e.target.value)} placeholder="현재 순위" className="h-9 w-32 rounded-md border border-line bg-canvas px-3 text-sm tabular-nums" />
          <Button size="sm" onClick={track} disabled={!newKw.trim() || !newPos}>기록</Button>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        {/* 키워드 목록 */}
        <div className="overflow-hidden rounded-lg border border-line bg-card shadow-sm xl:col-span-1">
          <div className="border-b border-line px-4 py-3 text-xs font-semibold uppercase text-ink2">추적 중인 키워드 {summary.length}건</div>
          <div className="divide-y divide-line">
            {summary.map((s) => {
              const rising = (s.delta ?? 0) > 0;
              const falling = (s.delta ?? 0) < 0;
              return (
                <button key={s.keyword} onClick={() => setSelected(s.keyword)} className={cn("flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors", selected === s.keyword ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/60")}>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">{s.keyword}</div>
                    <div className="text-[10px] text-ink2">{new Date(s.trackedAt).toLocaleDateString("ko-KR")} · {s.historyCount}회 측정</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-lg font-bold tabular-nums text-ink">{s.position}</span>
                    {s.delta === null ? (
                      <Minus className="h-4 w-4 text-slate-400" />
                    ) : rising ? (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"><TrendingUp className="h-4 w-4" />{s.delta}</span>
                    ) : falling ? (
                      <span className="flex items-center gap-0.5 text-xs font-bold text-rose-600 dark:text-rose-400"><TrendingDown className="h-4 w-4" />{Math.abs(s.delta)}</span>
                    ) : (
                      <Minus className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
            {!loading && summary.length === 0 && <p className="p-6 text-center text-xs text-slate-400">추적 중인 키워드가 없습니다.</p>}
          </div>
        </div>

        {/* 추이 차트 + 추천 */}
        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-lg border border-line bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">{selected ? `"${selected}" 순위 추이` : "추이"}</h2>
              {selected && <span className="text-[10px] text-ink2">Y축: 순위 (위쪽이 상위)</span>}
            </div>
            {chart && selected ? (
              <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" role="img" aria-label="순위 추이 차트">
                <line x1={chart.PAD} y1={chart.PAD - 4} x2={chart.PAD} y2={chart.H - chart.PAD} stroke="var(--line)" />
                <line x1={chart.PAD} y1={chart.H - chart.PAD} x2={chart.W - chart.PAD} y2={chart.H - chart.PAD} stroke="var(--line)" />
                <polyline points={chart.points} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {chart.labels.map((l, i) => (
                  <text key={i} x={chart.PAD + (i * (chart.W - chart.PAD * 2)) / (chart.labels.length - 1)} y={chart.H - 8} textAnchor="middle" fontSize="9" fill="var(--ink-2)">{l}</text>
                ))}
                <text x={chart.PAD - 4} y={chart.PAD} textAnchor="end" fontSize="9" fill="var(--ink-2)">{chart.min}위</text>
                <text x={chart.PAD - 4} y={chart.H - chart.PAD} textAnchor="end" fontSize="9" fill="var(--ink-2)">{chart.max}위</text>
              </svg>
            ) : (
              <p className="py-10 text-center text-xs text-slate-400">데이터가 2건 이상이어야 추이가 그려집니다.</p>
            )}
          </div>

          {/* 추천 */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/5">
            <div className="mb-2 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-amber-800 dark:text-amber-300">다음 포스팅 추천 (순위 변동 기반)</h2>
            </div>
            <div className="space-y-2">
              {recommend.map((r, i) => (
                <div key={i} className="rounded-md border border-amber-200 bg-white/70 p-3 dark:border-amber-500/20 dark:bg-slate-900/40">
                  <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">{r.reason}</p>
                  <ul className="mt-1.5 space-y-1">
                    {r.titles.map((t, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-xs text-ink">
                        <span className="text-amber-500">·</span>{t}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {recommend.length === 0 && <p className="text-xs text-ink2">순위가 하락한 키워드가 없거나, 추적 데이터가 부족합니다.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
