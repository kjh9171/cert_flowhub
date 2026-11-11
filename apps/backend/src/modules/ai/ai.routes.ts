// FlowHub AI 보조 기능 (OpenAI 연동, 키 없으면 mock)

import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";

const router = Router();
router.use(authMiddleware);

async function callOpenAI(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// POST /api/ai/summarize  { text }
router.post("/summarize", async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ message: "text는 필수입니다." });
  const prompt = `다음 텍스트를 한국어로 3문장 이내로 요약하세요:\n\n${text}`;
  const result = await callOpenAI(prompt);
  res.json({
    summary: result || `요약 (mock): ${String(text).slice(0, 120)}...`,
    poweredBy: result ? "openai" : "mock",
  });
});

// POST /api/ai/tags  { text }
router.post("/tags", async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ message: "text는 필수입니다." });
  const prompt = `다음 텍스트에서 핵심 키워드 태그 5개를 쉼표로 구분하여 한국어로 반환하세요:\n\n${text}`;
  const result = await callOpenAI(prompt);
  const tags = result
    ? result.split(/[,\n]/).map((t) => t.trim()).filter(Boolean).slice(0, 5)
    : ["협업", "작업", "일정", "지식", "팀"];
  res.json({ tags, poweredBy: result ? "openai" : "mock" });
});

export default router;
