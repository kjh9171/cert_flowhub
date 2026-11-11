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

// POST /api/uploads (multipart/form-data, field: file)
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "파일이 없습니다.");
    const file = req.file;
    const url = `/uploads/${file.filename}`;
    const { taskId, postId, knowledgeArticleId } = req.body || {};

    let attachment = null;
    if (taskId || postId || knowledgeArticleId) {
      attachment = await prisma.attachment.create({
        data: {
          fileName: file.originalname,
          fileUrl: url,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploaderId: req.user!.userId,
          taskId: taskId || null,
          postId: postId || null,
          knowledgeArticleId: knowledgeArticleId || null,
        },
      });
    }

    res.status(201).json({
      fileName: file.originalname,
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
