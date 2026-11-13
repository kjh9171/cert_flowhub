// FlowHub 파일 업로드 모듈

import { Router } from "express";
import multer from "multer";
import path from "path";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { io } from "../../realtime/socket";

const router = Router();
router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "/app/uploads");
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

/**
 * 파일명 인코딩 정규화.
 * - 브라우저 FormData는 RFC 5987 percent-encoding 전송 → decodeURIComponent로 복원
 * - curl 등 raw UTF-8 클라이언트는 busboy가 latin1로 해석해 깨진 문자열을 반환 →
 *   latin1 바이트를 유효한 UTF-8으로 재인코딩 시도 (실패 시 원본 유지)
 */
function normalizeFileName(name: string): string {
  let n = name;
  if (/%[0-9A-Fa-f]{2}/.test(n)) {
    try { n = decodeURIComponent(n); } catch { /* 그대로 유지 */ }
  }
  if (!/[\u0080-\uFFFF]/.test(n)) return n; // 순수 ASCII — 처리 불필요
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(n, "latin1"));
  } catch {
    return n; // genuine latin1 파일명 — 원본 유지
  }
}


// POST /api/uploads (multipart/form-data, field: file)
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "파일이 없습니다.");
    const file = req.file;
    const url = `/uploads/${file.filename}`;
    const { taskId, postId, knowledgeArticleId } = req.body || {};

    // 항상 Attachment 기록 생성 — 통합 검색(파일 탭)에서 파일명 대상 검색이 모든 업로드에 동작하도록
    const attachment = await prisma.attachment.create({
      data: {
        fileName: normalizeFileName(file.originalname), // 한글 파일명 인코딩 복원 (검색 연동)
        fileUrl: url,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploaderId: req.user!.userId,
        taskId: taskId || null,
        postId: postId || null,
        knowledgeArticleId: knowledgeArticleId || null,
      },
    });

    res.status(201).json({
      fileName: normalizeFileName(file.originalname), // 한글 파일명 인코딩 복원 (검색 연동)
      fileUrl: url,
      fileSize: file.size,
      mimeType: file.mimetype,
      attachment,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
