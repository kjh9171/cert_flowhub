// FlowHub 영업 키워드 순위 트래커 모듈
// - 키워드 노출 순위 기록/조회/추이
// - 자동 추천: 최근 변동 폭이 큰 키워드와 하락 키워드 기반의 규칙 기반 추천

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { resolveWorkspaceId } from "../../lib/workspace";

const router = Router();
router.use(authMiddleware);

// GET /api/keywords?workspaceId= — 키워드별 최신/이전 순위 요약
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const rows = await prisma.keywordRank.findMany({
      where: { workspaceId },
      orderBy: { trackedAt: "desc" },
      take: 500,
    });
    const byKeyword = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = byKeyword.get(r.keyword) ?? [];
      arr.push(r);
      byKeyword.set(r.keyword, arr);
    }
    const summary = [...byKeyword.entries()].map(([keyword, list]) => {
      const latest = list[0];
      const prev = list[1];
      return {
        keyword,
        position: latest.position,
        previousPosition: prev?.position ?? latest.previousPosition ?? null,
        delta: prev ? prev.position - latest.position : null, // +면 상승(순위 올라감)
        postUrl: latest.postUrl,
        postTitle: latest.postTitle,
        trackedAt: latest.trackedAt,
        historyCount: list.length,
      };
    }).sort((a, b) => a.keyword.localeCompare(b.keyword, "ko"));
    res.json(summary);
  } catch (e) { next(e); }
});

// GET /api/keywords/history?keyword=&workspaceId= — 추이 데이터
router.get("/history", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const keyword = String(req.query.keyword || "").trim();
    if (!keyword) throw new HttpError(400, "keyword 쿼리가 필요합니다.");
    const rows = await prisma.keywordRank.findMany({
      where: { workspaceId, keyword },
      orderBy: { trackedAt: "asc" },
      take: 180,
    });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/keywords/track — 순위 기록 { keyword, position, postUrl?, postTitle? }
router.post("/track", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const { keyword, position, postUrl, postTitle } = req.body || {};
    if (!keyword || position === undefined) throw new HttpError(400, "keyword와 position은 필수입니다.");
    const kw = String(keyword).trim();
    const last = await prisma.keywordRank.findFirst({ where: { workspaceId, keyword: kw }, orderBy: { trackedAt: "desc" } });
    const row = await prisma.keywordRank.create({
      data: {
        workspaceId,
        keyword: kw,
        position: Number(position),
        previousPosition: last?.position ?? null,
        postUrl: postUrl || null,
        postTitle: postTitle || null,
      },
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

// GET /api/keywords/recommend?workspaceId= — 다음 포스팅 추천 (규칙 기반)
router.get("/recommend", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const rows = await prisma.keywordRank.findMany({ where: { workspaceId }, orderBy: { trackedAt: "desc" }, take: 300 });
    const byKeyword = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = byKeyword.get(r.keyword) ?? [];
      arr.push(r);
      byKeyword.set(r.keyword, arr);
    }
    const declined: Array<{ keyword: string; drop: number }> = [];
    for (const [kw, list] of byKeyword) {
      if (list.length < 2) continue;
      const [a, b] = list;
      const drop = a.position - b.position; // +면 하락(순위 내려감)
      if (drop > 0) declined.push({ keyword: kw, drop });
    }
    declined.sort((a, b) => b.drop - a.drop);

    const SUFFIXES = ["방법", "추천", "가격", "비교", "후기", "2026"];
    const suggestions = declined.slice(0, 3).map(({ keyword, drop }) => ({
      reason: `"${keyword}" 순위가 ${drop.toFixed(1)}계단 하락 — 보강 포스팅 필요`,
      keyword,
      titles: [
        `${keyword} ${SUFFIXES[0]} — 2026년 최신 기준 정리`,
        `${keyword} ${SUFFIXES[1]} TOP 5 비교 (실제 담당자 관점)`,
        `${keyword} ${SUFFIXES[3]} — 견적/단가 체크리스트`,
      ],
    }));

    // 하락 키워드가 없으면 인기 변동 키워드로 대체 추천
    if (suggestions.length === 0) {
      const any = [...byKeyword.keys()].slice(0, 3);
      for (const kw of any) {
        suggestions.push({
          reason: `"${kw}" 관련 파생 키워드 포스팅으로 주제 영역 확장`,
          keyword: kw,
          titles: [`${kw} 입문 가이드`, `${kw} FAQ — 고객 질문 총정리`],
        });
      }
    }
    res.json({ declined, suggestions });
  } catch (e) { next(e); }
});

export default router;
