// FlowHub API 라우트 등록

import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/user/user.routes";
import workspaceRoutes from "../modules/workspace/workspace.routes";
import projectRoutes from "../modules/project/project.routes";
import taskRoutes from "../modules/task/task.routes";
import feedRoutes from "../modules/feed/feed.routes";
import knowledgeRoutes from "../modules/knowledge/knowledge.routes";
import integrationRoutes from "../modules/integration/integration.routes";
import notificationRoutes from "../modules/notification/notification.routes";
import searchRoutes from "../modules/search/search.routes";
import uploadRoutes from "../modules/upload/upload.routes";
import statsRoutes from "../modules/stats/stats.routes";
import calendarRoutes from "../modules/calendar/calendar.routes";
import aiRoutes from "../modules/ai/ai.routes";
import ordersRoutes from "../modules/orders/orders.routes";
import marketOrdersRoutes from "../modules/market-orders/market-orders.routes";
import inventoryRoutes from "../modules/inventory/inventory.routes";
import priceItemsRoutes from "../modules/price-items/price-items.routes";
import handoverMemosRoutes from "../modules/handover-memos/handover-memos.routes";
import drawingsRoutes from "../modules/drawings/drawings.routes";
import smsRoutes from "../modules/sms/sms.routes";
import emailsRoutes from "../modules/emails/emails.routes";
import keywordsRoutes from "../modules/keywords/keywords.routes";
import auditLogsRoutes from "../modules/audit-logs/audit-logs.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/workspaces", workspaceRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/feed", feedRoutes);
router.use("/knowledge", knowledgeRoutes);
router.use("/integrations", integrationRoutes);
router.use("/notifications", notificationRoutes);
router.use("/search", searchRoutes);
router.use("/uploads", uploadRoutes);
router.use("/stats", statsRoutes);
router.use("/calendar", calendarRoutes);
router.use("/ai", aiRoutes);
router.use("/orders", ordersRoutes);
router.use("/market-orders", marketOrdersRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/price-items", priceItemsRoutes);
router.use("/handover-memos", handoverMemosRoutes);
router.use("/drawings", drawingsRoutes);
router.use("/sms", smsRoutes);
router.use("/emails", emailsRoutes);
router.use("/keywords", keywordsRoutes);
router.use("/audit-logs", auditLogsRoutes);

export default router;
