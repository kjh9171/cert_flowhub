// FlowHub 캘린더 ICS 내보내기

import { Router } from "express";
import prisma from "../../lib/prisma";
import { authMiddleware } from "../../middleware/auth";

const router = Router();
router.use(authMiddleware);

// GET /api/calendar/ics?projectId=&workspaceId=
router.get("/ics", async (req, res, next) => {
  try {
    const { projectId, workspaceId } = req.query;
    const tasks = await prisma.task.findMany({
      where: {
        ...(projectId ? { projectId: String(projectId) } : {}),
        ...(workspaceId ? { workspaceId: String(workspaceId) } : {}),
        startDate: { not: null },
        endDate: { not: null },
      },
    });

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//FlowHub//Task Calendar//KO",
      "CALSCALE:GREGORIAN",
    ];

    for (const t of tasks) {
      const start = t.startDate!.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const end = t.endDate!.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${t.id}@flowhub`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`);
      lines.push(`DTSTART:${start}`);
      lines.push(`DTEND:${end}`);
      lines.push(`SUMMARY:${t.title.replace(/\n/g, " ")}`);
      if (t.content) lines.push(`DESCRIPTION:${t.content.replace(/\n/g, " ").slice(0, 500)}`);
      lines.push("END:VEVENT");
    }
    lines.push("END:VCALENDAR");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=flowhub.ics");
    res.send(lines.join("\r\n"));
  } catch (e) {
    next(e);
  }
});

export default router;
