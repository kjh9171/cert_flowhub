// FlowHub 시드 스크립트 (Idempotent)
// 실행: node prisma/seed.mjs  (DATABASE_URL 필요)
// 사용 라이브러리: @prisma/client, bcryptjs — 모두 package.json dependencies에 존재

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── 날짜 헬퍼: 오늘 기준 상대일수 → "YYYY-MM-DD" (간트 차트가 항상 현재 주에 보이도록) ──
const day = (offset) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return new Date(d);
};

try {
  // ── 멱등성 체크: admin이 이미 있으면 시드 완료로 간주 ──
  const existing = await prisma.user.findUnique({ where: { email: "admin@flowhub.local" } });
  if (existing) {
    console.log("✅ 시드가 이미 실행되었습니다. (admin@flowhub.local 존재)");
    process.exit(0);
  }

  console.log("🌱 FlowHub 데모 데이터 시드 시작...");
  const salt = await bcrypt.hash("admin123", 10); // 모든 데모 계정은 동일한 비밀번호 pattern 사용

  // ── 1. 사용자 (4명: 관리자 1 + 멤버 3) ──
  const admin = await prisma.user.create({
    data: { email: "admin@flowhub.local", passwordHash: salt, name: "김민준", role: "ADMIN", status: "ONLINE" },
  });
  const seoyeon = await prisma.user.create({
    data: { email: "demo@flowhub.local", passwordHash: salt, name: "이서연", role: "MEMBER", status: "ONLINE" },
  });
  const jihoon = await prisma.user.create({
    data: { email: "jihoon@flowhub.local", passwordHash: salt, name: "박지훈", role: "MEMBER", status: "AWAY" },
  });
  const yuna = await prisma.user.create({
    data: { email: "yuna@flowhub.local", passwordHash: salt, name: "최유나", role: "MEMBER", status: "BUSY" },
  });

  // ── 2. 워크스페이스 + 멤버십 ──
  const ws = await prisma.workspace.create({
    data: { name: "FlowHub 팀", slug: "flowhub-team", description: "플로우 스타일 통합 협업 플랫폼 개발 조직", ownerId: admin.id },
  });
  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: ws.id, userId: admin.id, role: "OWNER" },
      { workspaceId: ws.id, userId: seoyeon.id, role: "MEMBER" },
      { workspaceId: ws.id, userId: jihoon.id, role: "MEMBER" },
      { workspaceId: ws.id, userId: yuna.id, role: "MEMBER" },
    ],
  });

  // ── 3. 프로젝트 (2개 — 간트 차트 레이어 색상별) ──
  const projLaunch = await prisma.project.create({
    data: {
      workspaceId: ws.id, name: "플랫폼 출시 준비", color: "#2563EB",
      viewType: "GANTT", ownerId: admin.id, startDate: day(-10), endDate: day(25),
      description: "FlowHub 1.0 출시까지의 모든 작업",
    },
  });
  const projKb = await prisma.project.create({
    data: {
      workspaceId: ws.id, name: "지식 베이스 구축", color: "#10B981",
      viewType: "KANBAN", ownerId: admin.id, startDate: day(-5), endDate: day(20),
      description: "팀 문서화 및 위키 운영",
    },
  });
  await prisma.projectMember.createMany({
    data: [admin, seoyeon, jihoon, yuna].map((u) => ({
      projectId: projLaunch.id, userId: u.id, role: u.role === "ADMIN" ? "MANAGER" : "MEMBER",
    })).concat([{ projectId: projKb.id, userId: yuna.id, role: "MEMBER" }]),
  });

  // ── 4. 작업 (9개 — 상태/우선순위/진척도 분포, 종속성 포함) ──
  const t1 = await prisma.task.create({
    data: { projectId: projLaunch.id, workspaceId: ws.id, title: "API 인증 모듈 개발", authorId: admin.id,
      status: "DONE", priority: "HIGH", progress: 100, startDate: day(-9), endDate: day(-5),
      content: "JWT 발급/검증, bcrypt 해싱, middleware 등록 완료" },
  });
  const t2 = await prisma.task.create({
    data: { projectId: projLaunch.id, workspaceId: ws.id, title: "프론트엔드 로그인/회원가입 화면", authorId: seoyeon.id,
      status: "DONE", priority: "HIGH", progress: 100, startDate: day(-8), endDate: day(-4) },
  });
  const t3 = await prisma.task.create({
    data: { projectId: projLaunch.id, workspaceId: ws.id, title: "작업 CRUD API 구현", authorId: jihoon.id,
      status: "IN_PROGRESS", priority: "URGENT", progress: 80, startDate: day(-4), endDate: day(1) },
  });
  const t4 = await prisma.task.create({
    data: { projectId: projLaunch.id, workspaceId: ws.id, title: "간트 차트 UI 구현 (드래그 앤 드롭)", authorId: seoyeon.id,
      status: "IN_PROGRESS", priority: "HIGH", progress: 60, startDate: day(-3), endDate: day(8) },
  });
  const t5 = await prisma.task.create({
    data: { projectId: projLaunch.id, workspaceId: ws.id, title: "WebSocket 실시간 연동 (Badge/알림)", authorId: jihoon.id,
      status: "IN_PROGRESS", priority: "MEDIUM", progress: 40, startDate: day(3), endDate: day(15) },
  });
  const t6 = await prisma.task.create({
    data: { projectId: projKb.id, workspaceId: ws.id, title: "지식 베이스 문서 에디터", authorId: yuna.id,
      status: "REQUESTED", priority: "MEDIUM", progress: 0, startDate: day(5), endDate: day(14) },
  });
  const t7 = await prisma.task.create({
    data: { projectId: projLaunch.id, workspaceId: ws.id, title: "통합 검색 엔진 (초성/키워드)", authorId: admin.id,
      status: "REQUESTED", priority: "LOW", progress: 0, startDate: day(10), endDate: day(21) },
  });
  const t8 = await prisma.task.create({
    data: { projectId: projLaunch.id, workspaceId: ws.id, title: "Docker 배포 파이프라인", authorId: jihoon.id,
      status: "PAUSED", priority: "LOW", progress: 20, startDate: day(1), endDate: day(7) },
  });
  const t9 = await prisma.task.create({
    data: { projectId: projLaunch.id, workspaceId: ws.id, title: "E2E 스모크 테스트 (로그인→작업→Badge)", authorId: yuna.id,
      status: "IN_PROGRESS", priority: "URGENT", progress: 30, startDate: day(0), endDate: day(4) },
  });

  // 담당자 배분 (TaskAssignee)
  await prisma.taskAssignee.createMany({
    data: [
      { taskId: t1.id, userId: admin.id }, { taskId: t2.id, userId: seoyeon.id },
      { taskId: t3.id, userId: jihoon.id }, { taskId: t4.id, userId: seoyeon.id },
      { taskId: t5.id, userId: jihoon.id }, { taskId: t6.id, userId: yuna.id },
      { taskId: t7.id, userId: admin.id }, { taskId: t8.id, userId: jihoon.id },
      { taskId: t9.id, userId: yuna.id },
    ],
  });

  // 종속성 (FS: 선행 완료 → 후행 시작) — 간트 차트 화살표로 시각화
  await prisma.taskDependency.createMany({
    data: [
      { taskId: t4.id, dependsOnTaskId: t2.id, type: "FS" }, // UI는 화면 완료 후
      { taskId: t5.id, dependsOnTaskId: t3.id, type: "FS" }, // 실시간은 API 완료 후
      { taskId: t7.id, dependsOnTaskId: t6.id, type: "SS" }, // 검색은 에디터와 병행 시작
    ],
  });

  // ── 5. 연동 Badge (성공:Green / 진행중:Blue / 실패:Red) ──
  await prisma.integrationBadge.createMany({
    data: [
      { status: "SUCCESS", eventType: "PULL_REQUEST", title: "PR #42 인증 모듈 병합 완료",
        projectId: projLaunch.id, workspaceId: ws.id, taskId: t1.id, actorId: admin.id,
        targetUrl: "https://github.com/flowhub/app/pull/42" },
      { status: "SUCCESS", eventType: "COMMIT", title: "커밋 8f3a2c1 로그인 화면 반영",
        projectId: projLaunch.id, workspaceId: ws.id, taskId: t2.id, actorId: seoyeon.id },
      { status: "IN_PROGRESS", eventType: "CI_CD", title: "CI 파이프라인 #128 빌드 중 (stage 3/5)",
        projectId: projLaunch.id, workspaceId: ws.id, taskId: t5.id, actorId: jihoon.id },
      { status: "FAILED", eventType: "DEPLOY", title: "staging 배포 실패 — 이미지 푸시 타임아웃",
        projectId: projLaunch.id, workspaceId: ws.id, taskId: t8.id, actorId: jihoon.id },
      { status: "SUCCESS", eventType: "EXTERNAL_API", title: "GitHub Webhook 수신 성공",
        workspaceId: ws.id, actorId: admin.id },
    ],
  });

  // ── 6. 피드 (요청/일지/공유) + 댓글 + 멘션 ──
  const p1 = await prisma.feedPost.create({
    data: { workspaceId: ws.id, projectId: projLaunch.id, authorId: admin.id, type: "REQUEST",
      title: "간트 차트에 작업 드래그 저장 기능 필요", content: "@박지훈 간트 바를 드래그하면 기간이 바로 저장되어야 합니다. onDateChange 콜백으로 PATCH 호출하도록 구현해 주세요." },
  });
  const p2 = await prisma.feedPost.create({
    data: { workspaceId: ws.id, authorId: seoyeon.id, type: "JOURNAL",
      title: "일지 — 2단계 프론트엔드 모듈 완료", content: "4뷰 전환(피드/칸반/달력/간트)과 칸반 드래그 앤 드롭(@dnd-kit)을 완료했습니다. 간트 차트는 gantt-task-react로 구현했고, 드래그 시 REST+Socket으로 실시간 동기화됩니다." },
  });
  const p3 = await prisma.feedPost.create({
    data: { workspaceId: ws.id, projectId: projKb.id, authorId: yuna.id, type: "SHARE",
      title: "아키텍처 가이드 문서 공유", content: "플랫폼 아키텍처에 대한 팀 문서를 지식 베이스로 승격했습니다. @김민준 리뷰 부탁드려요!" },
  });
  await prisma.comment.createMany({
    data: [
      { postId: p1.id, authorId: jihoon.id, content: "확인했습니다. onDateChange에서 낙관적 갱신 + PATCH로 바로 처리하겠습니다." },
      { postId: p2.id, authorId: admin.id, content: "수고 많았습니다! 3단계에서 Socket 브로드캐스트 검증하겠습니다." },
      { postId: p3.id, authorId: admin.id, content: "TOC 자동 생성까지 잘 되어 있네요. 승인합니다." },
    ],
  });
  await prisma.mention.createMany({
    data: [
      { userId: jihoon.id, postId: p1.id },
      { userId: admin.id, postId: p3.id },
    ],
  });

  // ── 7. 지식 베이스 (팀 1건 + 개인 1건, 버전 기록 포함) ──
  const kb = await prisma.knowledgeArticle.create({
    data: {
      workspaceId: ws.id, authorId: yuna.id, title: "FlowHub 아키텍처 가이드", visibility: "TEAM",
      category: "아키텍처", tags: ["docker", "nextjs", "prisma"], version: 2, isPinned: true,
      summary: "FlowHub의 기술 스택과 서비스 구조를 설명합니다.",
      content: "# FlowHub 아키텍처 가이드\n\n## 개요\nFlowHub는 협업 툴 '플로우' 스타일의 UX를 갖춘 통합 협업 플랫폼입니다.\n\n## 기술 스택\n- **Frontend**: Next.js (App Router) + Tailwind CSS + Zustand\n- **Backend**: Express + TypeScript + Prisma ORM\n- **DB**: PostgreSQL 16 (메인), Redis 7 (세션/캐시/Pub-Sub)\n\n## 서비스 구조\n1. flowhub-frontend: Next.js Web App (Port 3000)\n2. flowhub-backend: API & WebSocket Server (Port 4000)\n3. flowhub-db: PostgreSQL 16\n4. flowhub-redis: Redis 7\n5. flowhub-proxy: Nginx 리버스 프록시\n\n## 실시간 연동\nSocket.io를 통해 작업 수정, Badge 상태 변경을 접속자에게 브로드캐스트합니다.",
    },
  });
  await prisma.knowledgeVersion.create({
    data: { articleId: kb.id, version: 1, title: "FlowHub 아키텍처 가이드", content: "# FlowHub 아키텍처 (초안)\n\n기술 스택 조사 중입니다.", editorId: yuna.id, changeNote: "초안 작성" },
  });
  await prisma.knowledgeArticle.create({
    data: { authorId: seoyeon.id, title: "개인 노트 — 1단계 회고", visibility: "PERSONAL",
      summary: "마스터 프롬프트 1단계 진행 노트", content: "- docker-compose 구성 완료\n- schema.prisma 전체 작성\n- UI 설계서 초안 작성" },
  });
  // 문서 ↔ 작업 링크 매핑 (스펙 C-2: 관련 Task 링크)
  await prisma.knowledgeLink.create({
    data: { articleId: kb.id, taskId: t4.id, label: "간트 차트 UI 구현 관련" },
  });

  // ── 8. 알림 (데모용) ──
  await prisma.notification.createMany({
    data: [
      { userId: jihoon.id, type: "TASK_ASSIGNED", title: "작업이 배정되었습니다", body: "'간트 차트에 작업 드래그 저장 기능 필요' 관련 요청을 받았습니다." },
      { userId: admin.id, type: "INTEGRATION", title: "연동 상태 변경", body: "staging 배포가 실패했습니다." },
    ],
  });

  console.log("✅ 시드 완료: 사용자 4, 워크스페이스 1, 프로젝트 2, 작업 9, Badge 5, 피드 3, 문서 2");
} catch (err) {
  // 기존 데모 데이터와 이메일 충돌 → 부분 시드로 간주하고 서버 기동을 막지 않음
  if (err.message?.includes("Unique constraint failed")) {
    console.log("⚠️ 기존 데모 데이터 충돌 감지 — 시드 건너뜀 (서버 기동 계속)");
    process.exit(0);
  }
  console.error("❌ 시드 실패:", err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
