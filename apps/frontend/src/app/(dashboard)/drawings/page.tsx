"use client";

// FlowHub 도면 뷰어 — DXF→SVG 자동 변환, 줌/팬, 두 점 치수 측정
// DWG/AI는 원본만 보관 (뷰어 비활성)

import React, { useEffect, useRef, useState } from "react";
import { DraftingCompass, Search, Trash2, Upload, ZoomIn, ZoomOut, Maximize2, Ruler, X, Move } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import type { DrawingFile } from "@/types";

const fmtSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.round(n / 1024)}KB`);

interface Pt { x: number; y: number }

function parseViewBox(svg: string): { x: number; y: number; w: number; h: number } | null {
  const m = /viewBox="(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)"/.exec(svg);
  return m ? { x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) } : null;
}

export default function DrawingsPage() {
  const [drawings, setDrawings] = useState<DrawingFile[]>([]);
  const [active, setActive] = useState<DrawingFile | null>(null);
  const [svgText, setSvgText] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // 뷰어 상태
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 });
  const [measure, setMeasure] = useState(false);
  const [measurePts, setMeasurePts] = useState<Pt[]>([]);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const res = await api.get("/drawings");
      setDrawings(Array.isArray(res.data) ? res.data : []);
    } catch { setDrawings([]); }
  };
  useEffect(() => { load(); }, []);

  const filtered = drawings.filter((d) => d.fileName.toLowerCase().includes(query.toLowerCase()));

  const openDrawing = async (d: DrawingFile) => {
    setActive(d);
    setScale(1);
    setPan({ x: 0, y: 0 });
    setMeasurePts([]);
    setError("");
    if (!d.svgUrl) { setSvgText(null); setError("이 형식은 뷰어로 열 수 없습니다. (DWG/AI는 변환 미지원)"); return; }
    try {
      const res = await api.get(`/drawings/${d.id}/svg`, { responseType: "text" });
      setSvgText(res.data as unknown as string);
    } catch {
      setSvgText(null);
      setError("도면 SVG를 불러오지 못했습니다.");
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/drawings", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "업로드 실패 (DXF/SVG/DWG/AI 지원)");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (d: DrawingFile) => {
    if (!window.confirm(`"${d.fileName}"을 삭제할까요?`)) return;
    await api.delete(`/drawings/${d.id}`);
    if (active?.id === d.id) { setActive(null); setSvgText(null); }
    await load();
  };

  // ── 뷰어 조작 ────────────────────────────────────────────
  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };
  const zoomBy = (factor: number) => setScale((s) => Math.min(8, Math.max(0.1, s * factor)));

  const onPointerDown = (e: React.PointerEvent) => {
    // 측정 모드에서는 드래그 팬 비활성
    if (measure) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    setPan({ x: drag.panX + (e.clientX - drag.startX), y: drag.panY + (e.clientY - drag.startY) });
  };
  const onPointerUp = () => { dragRef.current = null; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setScale((s) => Math.min(8, Math.max(0.1, s * factor)));
  };

  // 클라이언트 좌표 → viewBox 좌표 변환
  const viewBox = svgText ? parseViewBox(svgText) : null;
  const toViewBoxPt = (clientX: number, clientY: number): Pt | null => {
    if (!containerRef.current || !viewBox) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const lx = (clientX - rect.left - pan.x) / scale;
    const ly = (clientY - rect.top - pan.y) / scale;
    // preserveAspectRatio="xMidYMid meet" 보정
    const meet = Math.min(rect.width / viewBox.w, rect.height / viewBox.h);
    const offsetX = (rect.width - viewBox.w * meet) / 2;
    const offsetY = (rect.height - viewBox.h * meet) / 2;
    return {
      x: viewBox.x + (lx - offsetX) / meet,
      y: viewBox.y + (ly - offsetY) / meet,
    };
  };

  const onViewerClick = (e: React.MouseEvent) => {
    if (!measure) return;
    const pt = toViewBoxPt(e.clientX, e.clientY);
    if (!pt) return;
    setMeasurePts((prev) => (prev.length >= 2 ? [pt] : [...prev, pt]));
  };

  const measureDistance = measurePts.length === 2
    ? Math.hypot(measurePts[1].x - measurePts[0].x, measurePts[1].y - measurePts[0].y)
    : null;

  return (
    <div className="flex h-full">
      {/* 목록 */}
      <div className="flex w-80 shrink-0 flex-col border-r border-line bg-card">
        <div className="flex h-14 items-center justify-between gap-2 border-b border-line px-4">
          <div className="flex items-center gap-2">
            <DraftingCompass className="h-5 w-5 text-sky-500" />
            <h1 className="text-lg font-bold text-ink">도면 뷰어</h1>
          </div>
          <label className={cn("flex cursor-pointer items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700", uploading && "opacity-50")}>
            <Upload className="h-4 w-4" /> {uploading ? "업로드 중" : "도면 업로드"}
            <input type="file" accept=".dxf,.dwg,.ai,.pdf,.svg,.png,.jpg" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          </label>
        </div>
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="도면 파일명 검색..." className="h-8 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-xs focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((d) => (
            <div key={d.id} role="button" tabIndex={0} onClick={() => openDrawing(d)} className={cn("group flex w-full items-start gap-2 border-b border-line px-4 py-3 text-left transition-colors", active?.id === d.id ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/60")}>
              <DraftingCompass className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-ink" title={d.fileName}>{d.fileName}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-ink2">
                  <span>{fmtSize(d.size)}</span>
                  <span className={cn("rounded border px-1 py-0.5 font-semibold", d.svgUrl ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300" : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800")}>{d.svgUrl ? "뷰어 가능" : "원본만"}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-ink2">{new Date(d.createdAt).toLocaleDateString("ko-KR")} · {d.uploader?.name}</div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); remove(d); }} className="hidden shrink-0 rounded p-1 text-slate-400 hover:text-rose-500 group-hover:block" aria-label="삭제"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {filtered.length === 0 && <p className="p-6 text-center text-xs text-slate-400">도면이 없습니다. DXF/AI/DWG 파일을 업로드하세요.</p>}
        </div>
      </div>

      {/* 뷰어 */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-canvas">
        {active ? (
          <>
            {/* 뷰어 툴바 */}
            <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line bg-card px-3">
              <div className="min-w-0 text-xs">
                <span className="font-semibold text-ink">{active.fileName}</span>
                <span className="ml-2 text-ink2">휠: 확대/축소 · 드래그: 이동</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => zoomBy(1 / 1.25)} className="rounded-md border border-line p-1.5 text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="축소"><ZoomOut className="h-4 w-4" /></button>
                <span className="w-12 text-center text-xs tabular-nums text-ink2">{Math.round(scale * 100)}%</span>
                <button onClick={() => zoomBy(1.25)} className="rounded-md border border-line p-1.5 text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="확대"><ZoomIn className="h-4 w-4" /></button>
                <button onClick={resetView} className="rounded-md border border-line p-1.5 text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="맞춤" title="화면 맞춤"><Maximize2 className="h-4 w-4" /></button>
                <button
                  onClick={() => { setMeasure((v) => !v); setMeasurePts([]); }}
                  aria-pressed={measure}
                  className={cn("flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium", measure ? "border-blue-600 bg-blue-600 text-white" : "border-line text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800")}
                  title="치수 측정 (두 점 클릭)"
                >
                  <Ruler className="h-4 w-4" /> 측정
                </button>
                {measurePts.length > 0 && <button onClick={() => setMeasurePts([])} className="rounded-md border border-line p-1.5 text-ink2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="측정 지우기"><X className="h-4 w-4" /></button>}
              </div>
            </div>

            {/* 도면 캔버스 */}
            <div
              ref={containerRef}
              className={cn("relative flex-1 overflow-hidden", measure ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing")}
              style={{ color: "var(--ink-2)" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onWheel={onWheel}
              onClick={onViewerClick}
            >
              {svgText ? (
                <div className="absolute inset-0 will-change-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "0 0" }}>
                  <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svgText }} />
                  {/* 측정 오버레이 */}
                  {viewBox && measurePts.length > 0 && (
                    <svg viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
                      {measurePts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r={Math.max(viewBox.w, viewBox.h) / 150} fill="#ef4444" stroke="#fff" strokeWidth={Math.max(viewBox.w, viewBox.h) / 500} />
                      ))}
                      {measurePts.length === 2 && (
                        <>
                          <line x1={measurePts[0].x} y1={measurePts[0].y} x2={measurePts[1].x} y2={measurePts[1].y} stroke="#ef4444" strokeWidth={Math.max(viewBox.w, viewBox.h) / 300} strokeDasharray={`${Math.max(viewBox.w, viewBox.h) / 60} ${Math.max(viewBox.w, viewBox.h) / 80}`} />
                        </>
                      )}
                    </svg>
                  )}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                  <Move className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-ink2">{error || "원본 파일만 보관 중입니다. DXF/SVG 파일을 업로드하면 뷰어로 열 수 있습니다."}</p>
                  <a href={active.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline dark:text-blue-400">원본 다운로드</a>
                </div>
              )}

              {/* 측정 결과 배지 */}
              {measureDistance !== null && (
                <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg border border-line bg-card px-4 py-2 text-center shadow-lg">
                  <div className="text-[10px] font-semibold uppercase text-ink2">두 점 거리</div>
                  <div className="text-lg font-bold tabular-nums text-ink">{measureDistance.toFixed(2)} <span className="text-xs font-normal text-ink2">도면 단위</span></div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <DraftingCompass className="h-12 w-12 text-slate-200 dark:text-slate-700" />
            <p className="text-sm text-ink2">좌측에서 도면을 선택하세요.</p>
            <p className="max-w-xs text-[11px] leading-relaxed text-ink2">DXF ↔ SVG 자동 변환 지원 · 줌/팬 · 두 점 치수 측정 · DWG/AI는 원본 보관만 지원</p>
          </div>
        )}
      </div>
    </div>
  );
}
