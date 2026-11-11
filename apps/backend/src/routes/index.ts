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

export default router;
