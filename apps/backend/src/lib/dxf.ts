// DXF → SVG 최소 변환기 (도면 뷰어용)
// 지원 엔티티: LINE, CIRCLE, ARC, LWPOLYLINE, TEXT, MTEXT
// - DWG(바이너리)·AI는 변환 불가 → 원본 업로드/메타데이터만 제공
// - 결과 SVG는 currentColor 스트로크 → 프론트에서 다크/라이트 색상 제어
// - DXF는 y-up, SVG는 y-down → 좌표 방출 시 y를 반전한다

export interface DxfParseResult {
  svg: string;
  width: number;
  height: number;
  stats: Record<string, number>;
}

interface Pt { x: number; y: number }
type Op = (fY: (y: number) => number) => string;

export function dxfToSvg(dxf: string): DxfParseResult {
  // ── 쌍(코드/값) 스트림으로 파싱 ─────────────────────────
  const raw = dxf.split(/\r\n|\n|\r/);
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const code = raw[i].trim();
    if (code) pairs.push([code, raw[i + 1]]);
  }

  // ── ENTITIES 섹션만 추림 ───────────────────────────────
  let inEntities = false;
  const entityPairs: Array<[string, string]> = [];
  for (let i = 0; i < pairs.length; i++) {
    const [code, value] = pairs[i];
    const v = value.trim();
    if (code === "0" && v === "SECTION") {
      const next = pairs[i + 1];
      if (next && next[0] === "2" && next[1].trim() === "ENTITIES") {
        inEntities = true;
        i += 1;
        continue;
      }
    }
    if (code === "0" && v === "ENDSEC") { inEntities = false; continue; }
    if (inEntities) entityPairs.push(pairs[i]);
  }

  // ── 엔티티 그룹화 ─────────────────────────────────────
  const entities: Array<Record<string, Array<string>>> = [];
  let cur: Record<string, Array<string>> | null = null;
  for (const [code, value] of entityPairs) {
    if (code === "0") {
      if (cur) entities.push(cur);
      cur = { __type: [value.trim()] };
    } else if (cur) {
      (cur[code] = cur[code] || []).push(value.trim());
    }
  }
  if (cur) entities.push(cur);

  const num = (arr: string[] | undefined) => (arr && arr.length ? Number(arr[0]) : NaN);
  const stats: Record<string, number> = {};
  const bump = (k: string) => { stats[k] = (stats[k] || 0) + 1; };

  // ── 1차 패스: 드로우 오퍼레이션 + 바운딩 박스 ───────────
  const ops: Op[] = [];
  const pts: Pt[] = [];
  const fmt = (n: number) => Number(n.toFixed(2));

  for (const e of entities) {
    const t = e.__type?.[0] || "UNKNOWN";
    bump(t);

    if (t === "LINE") {
      const x1 = num(e["10"]), y1 = num(e["20"]), x2 = num(e["11"]), y2 = num(e["21"]);
      if (![x1, y1, x2, y2].every(isFinite)) continue;
      ops.push((fY) => `<line x1="${fmt(x1)}" y1="${fmt(fY(y1))}" x2="${fmt(x2)}" y2="${fmt(fY(y2))}"/>`);
      pts.push({ x: x1, y: y1 }, { x: x2, y: y2 });
      continue;
    }
    if (t === "CIRCLE") {
      const cx = num(e["10"]), cy = num(e["20"]), r = num(e["40"]);
      if (![cx, cy, r].every(isFinite)) continue;
      ops.push((fY) => `<circle cx="${fmt(cx)}" cy="${fmt(fY(cy))}" r="${fmt(r)}"/>`);
      pts.push({ x: cx - r, y: cy - r }, { x: cx + r, y: cy + r });
      continue;
    }
    if (t === "ARC") {
      const cx = num(e["10"]), cy = num(e["20"]), r = num(e["40"]);
      const a0 = num(e["50"]), a1 = num(e["51"]);
      if (![cx, cy, r, a0, a1].every(isFinite)) continue;
      const rad = (d: number) => (d * Math.PI) / 180;
      const sx = cx + r * Math.cos(rad(a0)), sy = cy + r * Math.sin(rad(a0));
      const ex = cx + r * Math.cos(rad(a1)), ey = cy + r * Math.sin(rad(a1));
      let large = (a1 - a0) % 360; if (large < 0) large += 360;
      const largeBit = large > 180 ? 1 : 0;
      // y-flip 후 sweep 방향이 반전되므로 0으로 둔다
      ops.push((fY) => `<path d="M ${fmt(sx)} ${fmt(fY(sy))} A ${fmt(r)} ${fmt(r)} 0 ${largeBit} 0 ${fmt(ex)} ${fmt(fY(ey))}"/>`);
      pts.push({ x: cx - r, y: cy - r }, { x: cx + r, y: cy + r });
      continue;
    }
    if (t === "LWPOLYLINE") {
      const closed = ((num(e["70"]) || 0) & 1) === 1;
      const xs = e["10"] || [], ys = e["20"] || [];
      const list: Pt[] = [];
      for (let k = 0; k < Math.min(xs.length, ys.length); k++) {
        const x = Number(xs[k]), y = Number(ys[k]);
        if (isFinite(x) && isFinite(y)) list.push({ x, y });
      }
      if (list.length >= 2) {
        ops.push((fY) => {
          const p = list.map((q) => `${fmt(q.x)},${fmt(fY(q.y))}`).join(" ");
          return closed ? `<polygon points="${p}"/>` : `<polyline points="${p}"/>`;
        });
        pts.push(...list);
      }
      continue;
    }
    if (t === "TEXT" || t === "MTEXT") {
      const x = num(e["10"]), y = num(e["20"]);
      const h = num(e["40"]) || 10;
      const str = (e["1"] || [""])[0].slice(0, 200);
      if (![x, y].every(isFinite) || !str) continue;
      const escaped = str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      ops.push((fY) => `<text x="${fmt(x)}" y="${fmt(fY(y))}" font-size="${fmt(h)}" fill="currentColor" stroke="none">${escaped}</text>`);
      pts.push({ x, y });
      continue;
    }
  }

  // ── 2차 패스: y 반전 함수로 SVG 방출 ─────────────────────
  if (!pts.length) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%"><text x="50" y="55" font-size="7" text-anchor="middle" fill="currentColor">변환 가능한 엔티티 없음</text></svg>`;
    return { svg, width: 100, height: 100, stats };
  }
  const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
  const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
  const pad = Math.max(spanX, spanY) * 0.05;
  const w = spanX + pad * 2, h = spanY + pad * 2;
  const fY = (y: number) => maxY + minY - y; // y축 반전

  const strokeWidth = Math.max(w, h) / 500;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(minX - pad)} ${fmt(minY - pad)} ${fmt(w)} ${fmt(h)}" width="100%" ` +
    `fill="none" stroke="currentColor" stroke-width="${strokeWidth.toFixed(3)}" stroke-linecap="round" stroke-linejoin="round">` +
    ops.map((op) => op(fY)).join("") +
    `</svg>`;
  return { svg, width: w, height: h, stats };
}
