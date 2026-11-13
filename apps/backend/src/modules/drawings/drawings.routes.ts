// FlowHub 도면 뷰어 모듈
// - DXF → SVG 자동 변환 (브라우저 뷰어용), DWG/AI는 원본만 보관 (상태 UNSUPPORTED)
// - 발주노트에 도면 연결 가능

import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";
import { HttpError } from "../../middleware/error";
import { resolveWorkspaceId } from "../../lib/workspace";
import { dxfToSvg } from "../../lib/dxf";

const router = Router();
router.use(authMiddleware);

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const dir = "/app/uploads/drawings";
    await fs.mkdir(dir, { recursive: true }).catch(() => {});
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 80 * 1024 * 1024 } });

// GET /api/drawings?workspaceId=
router.get("/", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const drawings = await prisma.drawingFile.findMany({
      where: { workspaceId },
      include: { uploader: { select: { id: true, name: true } }, _count: { select: { orderNotes: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(drawings);
  } catch (e) { next(e); }
});

// GET /api/drawings/:id/svg — 뷰어용 SVG 원문 반환
router.get("/:id/svg", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const drawing = await prisma.drawingFile.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!drawing) throw new HttpError(404, "도면을 찾을 수 없습니다.");
    if (!drawing.svgUrl) throw new HttpError(404, "이 도면은 SVG 변환본이 없습니다. (미지원 형식이거나 변환 실패)");
    const filePath = `/app${drawing.svgUrl}`;
    const svg = await fs.readFile(filePath, "utf-8");
    res.type("image/svg+xml").send(svg);
  } catch (e) { next(e); }
});

// POST /api/drawings (multipart, field: file) — DXF는 자동 SVG 변환
router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, "파일이 없습니다.");
    const workspaceId = await resolveWorkspaceId(req);
    const f = req.file;
    const ext = path.extname(f.originalname).toLowerCase();
    const fileUrl = `/uploads/drawings/${f.filename}`;

    let svgUrl: string | null = null;
    let status: "READY" | "CONVERTING" | "UNSUPPORTED" = "READY";

    if (ext === ".dxf") {
      try {
        const dxf = await fs.readFile(f.path, "utf-8");
        const { svg } = dxfToSvg(dxf);
        const svgPath = f.path.replace(/\.dxf$/i, ".svg");
        await fs.writeFile(svgPath, svg, "utf-8");
        svgUrl = fileUrl.replace(/\.dxf$/i, ".svg");
      } catch (e) {
        console.error("[drawings] DXF 변환 실패:", e);
        status = "UNSUPPORTED";
      }
    } else if (ext === ".svg") {
      svgUrl = fileUrl; // SVG는 그대로 뷰어에 표시
    } else {
      status = "UNSUPPORTED"; // DWG/AI/PDF — 원본 보관 + 메타데이터
    }

    const drawing = await prisma.drawingFile.create({
      data: {
        workspaceId,
        fileName: f.originalname,
        fileUrl,
        svgUrl,
        mimeType: f.mimetype || "application/octet-stream",
        size: f.size,
        status,
        uploaderId: req.user!.userId,
      },
    });
    res.status(201).json(drawing);
  } catch (e) { next(e); }
});

// DELETE /api/drawings/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const workspaceId = await resolveWorkspaceId(req);
    const existing = await prisma.drawingFile.findFirst({ where: { id: req.params.id, workspaceId } });
    if (!existing) throw new HttpError(404, "도면을 찾을 수 없습니다.");
    await prisma.drawingFile.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
