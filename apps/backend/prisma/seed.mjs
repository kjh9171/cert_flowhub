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
  // ── 멱등성 체크: admin이 이미 있으면 기본 시드는 건너뜀 (ERP 시드는 계속 진행) ──
  const existing = await prisma.user.findUnique({ where: { email: "admin@flowhub.local" } });
  if (existing) {
    console.log("✅ 기본 시드는 건너뜀 — ERP 데모 시드만 진행");
  } else {
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
  }
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

// ─────────────────────────────────────────────
// ERP 데모 시드 (수주/현장 운영) — 멱등
// 기본 시드와 독립적으로 실행된다 (관리자 존재 시에도 실행).
// ─────────────────────────────────────────────
try {
  await prisma.$connect();
  const ws = await prisma.workspace.findFirst({ where: { slug: "flowhub-team" } }) ?? (await prisma.workspace.findFirst({ orderBy: { createdAt: "asc" } }));
  const admin = await prisma.user.findUnique({ where: { email: "admin@flowhub.local" } });
  if (!ws || !admin) {
    console.log("⚠️ ERP 시드 건너뜀 — 기본 워크스페이스/사용자가 없습니다");
  } else if ((await prisma.orderNote.count({ where: { workspaceId: ws.id } })) > 0) {
    console.log("✅ ERP 데모 데이터 이미 존재 — 건너뜀");
  } else {
    console.log("🌱 ERP 데모 데이터 시드 시작...");
    const jihoon = await prisma.user.findUnique({ where: { email: "jihoon@flowhub.local" } });
    const yuna = await prisma.user.findUnique({ where: { email: "yuna@flowhub.local" } });
    const seoyeon = await prisma.user.findUnique({ where: { email: "demo@flowhub.local" } });
    const day = (offset) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + offset);
      return d;
    };

    // ── 1. 발주노트 (진행중 1 + 접수 1) + 품목 ──
    const order1 = await prisma.orderNote.create({
      data: {
        workspaceId: ws.id,
        orderNo: "PO-2026-0001-A1B2",
        partnerName: "(주)한빛정밀",
        partnerContact: "02-3456-7890 (윤부장)",
        status: "IN_PRODUCTION",
        paymentStatus: "UNPAID",
        supplyAmount: 1090000,
        vatAmount: 109000,
        totalAmount: 1199000,
        dueDate: day(7),
        memo: "납기 촉박 — 도면 변경 없음. 레이저 컷팅 후 Bending 2회.",
        authorId: admin.id,
        items: {
          create: [
            { name: "플레이트 40T", spec: "SS400 40mm", qty: 20, unit: "EA", unitPrice: 12000, amount: 240000 },
            { name: "브라켓 SET", spec: "도면 DWG-2026-011", qty: 10, unit: "SET", unitPrice: 85000, amount: 850000 },
          ],
        },
      },
    });
    await prisma.orderNote.create({
      data: {
        workspaceId: ws.id,
        orderNo: "PO-2026-0002-C3D4",
        partnerName: "삼성물산 건설부문",
        partnerContact: "02-6789-0123 (김과장)",
        status: "CONFIRMED",
        paymentStatus: "PAID",
        supplyAmount: 2250000,
        vatAmount: 225000,
        totalAmount: 2475000,
        dueDate: day(14),
        memo: "3차 분할 납품 예정. 도장 포함(분체 도장 회색).",
        authorId: admin.id,
        items: {
          create: [{ name: "패널 조립품", spec: "수배전반용", qty: 50, unit: "EA", unitPrice: 45000, amount: 2250000 }],
        },
      },
    });

    // ── 2. 통합주문 (미발송 4 + 배송중 1 + 완료 1) ──
    await prisma.marketOrder.createMany({
      data: [
        { workspaceId: ws.id, platform: "SMARTSTORE", orderNo: "20261113NA0001", buyerName: "이수진", buyerPhone: "010-1111-2222", productName: "서보드라이버 SVD-2000", qty: 2, price: 330000, isPrepaid: true, recipientName: "이수진", recipientAddress: "서울특별시 강서구 마곡중앙로 161, 3층", recipientPhone: "010-1111-2222", status: "PENDING", dueDate: day(1) },
        { workspaceId: ws.id, platform: "SMARTSTORE", orderNo: "20261113NA0002", buyerName: "박민서", buyerPhone: "010-2222-3333", productName: "근접센서 PRX-18M", qty: 10, price: 88000, isPrepaid: true, recipientName: "박민서", recipientAddress: "경기도 성남시 분당구 판교로 242", recipientPhone: "010-2222-3333", status: "PENDING", dueDate: day(2) },
        { workspaceId: ws.id, platform: "COUPANG", orderNo: "CP-20261113-0098", buyerName: "최준영", buyerPhone: "010-3333-4444", productName: "산업용 릴레이 포토커플러 SET", qty: 1, price: 125000, isPrepaid: false, recipientName: "최준영", recipientAddress: "인천광역시 연수구 컨벤시아대로 165", recipientPhone: "010-3333-4444", status: "PENDING", dueDate: day(2) },
        { workspaceId: ws.id, platform: "COUPANG", orderNo: "CP-20261113-0099", buyerName: "정하은", buyerPhone: "010-4444-5555", productName: "컨트롤러 IP65 제어박스", qty: 1, price: 480000, isPrepaid: false, recipientName: "정하은", recipientAddress: "부산광역시 해운대구 센텀중앙로 97", recipientPhone: "010-4444-5555", status: "PENDING", dueDate: day(3) },
        { workspaceId: ws.id, platform: "SMARTSTORE", orderNo: "20261112NA0007", buyerName: "김도현", buyerPhone: "010-5555-6666", productName: "터미널 블록 M4 100개입", qty: 3, price: 45000, isPrepaid: true, recipientName: "김도현", recipientAddress: "대구광역시 달성군 테크노대로 29", recipientPhone: "010-5555-6666", status: "SHIPPING", shippedAt: day(-1), trackingNo: "531254789654", dueDate: day(-1) },
        { workspaceId: ws.id, platform: "COUPANG", orderNo: "CP-20261110-0077", buyerName: "한서윤", buyerPhone: "010-6666-7777", productName: "배선 세트 20P", qty: 5, price: 60000, isPrepaid: true, recipientName: "한서윤", recipientAddress: "울산광역시 북구 산업로 1040", recipientPhone: "010-6666-7777", status: "DELIVERED", shippedAt: day(-3), trackingNo: "531258888777", dueDate: day(-4) },
      ],
    });

    // ── 3. 단가표 ──
    await prisma.priceItem.createMany({
      data: [
        { workspaceId: ws.id, category: "판금/레이저", bundle: null, name: "냉연강판 SPCC 1.5T", unitPrice: 2800, note: "kg" },
        { workspaceId: ws.id, category: "판금/레이저", bundle: null, name: "SS400 플레이트 40T", unitPrice: 12000, note: "EA" },
        { workspaceId: ws.id, category: "판금/레이저", bundle: "절단+Bending 세트", name: "플레이트 절단+Bend 가공비", unitPrice: 15000, note: "EA" },
        { workspaceId: ws.id, category: "용접", bundle: null, name: "CO2 용접 (MIG)", unitPrice: 8000, note: "점당" },
        { workspaceId: ws.id, category: "도장", bundle: null, name: "분체 도장 (회색)", unitPrice: 6000, note: "EA" },
        { workspaceId: ws.id, category: "조립", bundle: "패널 조립 세트", name: "수배전반 패널 조립", unitPrice: 45000, note: "EA" },
        { workspaceId: ws.id, category: "전자부품", bundle: null, name: "서보드라이버 SVD-2000", unitPrice: 165000, note: "EA" },
        { workspaceId: ws.id, category: "전자부품", bundle: null, name: "PLC CPU 모듈 FX5U", unitPrice: 520000, note: "EA" },
        { workspaceId: ws.id, category: "전자부품", bundle: "센서 패키지", name: "근접센서 PRX-18M", unitPrice: 8800, note: "EA" },
        { workspaceId: ws.id, category: "케이블/배선", bundle: null, name: "배선 세트 20P (1m)", unitPrice: 12000, note: "EA" },
      ],
    });

    // ── 4. 재고 (원자재 3 + 제품 5) ──
    const inv = await Promise.all([
      prisma.inventoryItem.create({ data: { workspaceId: ws.id, sku: "RM-001", name: "냉연강판 SPCC 1.5T", kind: "RAW", unit: "kg", qty: 120, safetyQty: 50 } }),
      prisma.inventoryItem.create({ data: { workspaceId: ws.id, sku: "RM-002", name: "알루미늄 판 6T", kind: "RAW", unit: "장", qty: 4, safetyQty: 10 } }),
      prisma.inventoryItem.create({ data: { workspaceId: ws.id, sku: "RM-003", name: "STS304 환봉 30파이", kind: "RAW", unit: "kg", qty: 30, safetyQty: 10 } }),
      prisma.inventoryItem.create({ data: { workspaceId: ws.id, sku: "PD-001", name: "플레이트 40T", kind: "PRODUCT", unit: "EA", qty: 8, safetyQty: 20 } }),
      prisma.inventoryItem.create({ data: { workspaceId: ws.id, sku: "PD-002", name: "브라켓 SET", kind: "PRODUCT", unit: "SET", qty: 35, safetyQty: 10 } }),
      prisma.inventoryItem.create({ data: { workspaceId: ws.id, sku: "PD-003", name: "수배전반 패널 조립품", kind: "PRODUCT", unit: "EA", qty: 12, safetyQty: 5 } }),
      prisma.inventoryItem.create({ data: { workspaceId: ws.id, sku: "PD-004", name: "컨트롤러 IP65 제어박스", kind: "PRODUCT", unit: "EA", qty: 60, safetyQty: 20 } }),
      prisma.inventoryItem.create({ data: { workspaceId: ws.id, sku: "PD-005", name: "배선 세트 20P", kind: "PRODUCT", unit: "EA", qty: 200, safetyQty: 50 } }),
    ]);
    await prisma.inventoryLog.createMany({
      data: [
        { itemId: inv[0].id, delta: -15, after: 120, reason: "PO-2026-0001 한빛정밀 출고", actorId: admin.id },
        { itemId: inv[1].id, delta: -2, after: 4, reason: "프로토타입 제작 출고", actorId: jihoon?.id },
        { itemId: inv[3].id, delta: -4, after: 8, reason: "PO-2026-0001 출고", actorId: admin.id },
      ],
    });

    // ── 5. 전달사항 ──
    await prisma.handoverMemo.create({
      data: { workspaceId: ws.id, authorId: jihoon?.id ?? admin.id, content: "@PO-2026-0001-A1B2 한빛정밀 — 도면 수정 요청(DWG-2026-011 Rev.B) 와 있습니다. 치수 2곳(34→36, 12→11) 확인 후 절단 진행해주세요.", done: false, orderNoteId: order1.id, photos: [] },
    });
    await prisma.handoverMemo.create({
      data: { workspaceId: ws.id, authorId: admin.id, content: "내일 오전 9시 삼성물산 품질 팀 방문 — 수배전반 패널 최종 검수, 검수 기준서 3부 지참할 것.", done: false, photos: [] },
    });
    await prisma.handoverMemo.create({
      data: { workspaceId: ws.id, authorId: yuna?.id ?? admin.id, content: "배선 세트 재주문 — 안전재고 50EA 하한 도달, 견적 3곳 비교 후 발주 진행.", done: true, photos: [] },
    });

    // ── 6. 문자 대화 2건 ──
    const thread1 = await prisma.smsThread.create({
      data: { workspaceId: ws.id, participantName: "한빛정밀 윤부장", participantPhone: "010-7777-8888", lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 5), unreadCount: 1 },
    });
    await prisma.smsMessage.createMany({
      data: [
        { threadId: thread1.id, direction: "OUT", content: "윤부장님, PO-2026-0001 재고 확인했습니다. 내일 오전 출고 가능합니다.", attachments: [], isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 7) },
        { threadId: thread1.id, direction: "IN", content: "감사합니다. 그런데 도면 Rev.B로 바뀐 걸로 절단해주셔야 합니다. 파일 보내드릴게요.", attachments: ["/uploads/seed/drawing-revb.png"], isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5) },
      ],
    });
    const thread2 = await prisma.smsThread.create({
      data: { workspaceId: ws.id, participantName: "삼성물산 김과장", participantPhone: "010-8888-9999", lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 30), unreadCount: 0 },
    });
    await prisma.smsMessage.createMany({
      data: [
        { threadId: thread2.id, direction: "OUT", content: "김과장님, 3차 분할 납품 일정 확정 부탁드립니다. 15일 이전 납품 가능합니다.", attachments: [], isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30) },
      ],
    });

    // ── 7. 비즈니스 메일 ──
    const received = (h) => new Date(Date.now() - 1000 * 60 * 60 * h);
    await prisma.businessEmail.createMany({
      data: [
        { workspaceId: ws.id, fromName: "더존비즈온", fromEmail: "taxinvoice@douzone.com", subject: "전자세금계산서가 발행되었습니다 (PO-2026-0002)", snippet: "발행금액 2,475,000원, 작성일자 2026-11-13...", classification: "TAX_INVOICE", isRead: false, receivedAt: received(2) },
        { workspaceId: ws.id, fromName: "(주)한빛정밀 윤부장", fromEmail: "yun@hanbit-precision.co.kr", subject: "견적 요청드립니다 — 브라켓 SET 100개", snippet: "안녕하세요, 한빛정밀 윤부장입니다. 브라켓 SET 100개 견적 부탁드립니다. 납기는 12월 중순입니다...", classification: "VENDOR", isRead: false, receivedAt: received(4) },
        { workspaceId: ws.id, fromName: "삼성물산 김과장", fromEmail: "kim.cs@samsungeng.com", subject: "3차 분할 납품 일정 회신", snippet: "3차 물량은 12/20까지 납품 완료해 주세요. 검수 일정은 별도 안내하겠습니다.", classification: "VENDOR", isRead: true, receivedAt: received(26) },
        { workspaceId: ws.id, fromName: "스마트공장 엑스포", fromEmail: "news@smartfactory-expo.kr", subject: "[광고] 2026 스마트공장 엑스포 초대장", snippet: "2026년 12월 1일~3일 COEX, 스마트팩토리 전시회에 귀사를 초대합니다...", classification: "UNHANDLED", isRead: false, receivedAt: received(8) },
        { workspaceId: ws.id, fromName: "한국산업단지공단", fromEmail: "notice@kicox.or.kr", subject: "중소 제조기업 스마트화 지원사업 안내", snippet: "2026년 스마트공장 구축 지원사업 접수를 시작합니다. 신청기간 11/20~12/10...", classification: "UNHANDLED", isRead: true, receivedAt: received(30) },
        { workspaceId: ws.id, fromName: "웹케시", fromEmail: "taxinvoice@webcash.kr", subject: "전자세금계산서 자동발행 안내", snippet: "공급가액 1,090,000원, 부가세 109,000원. 발행일 2026-11-13.", classification: "TAX_INVOICE", isRead: true, receivedAt: received(50) },
      ],
    });

    // ── 8. 영업 키워드 순위 (3일 추이) ──
    const kwData = [
      { keyword: "레이저절단", positions: [3, 5, 8] },
      { keyword: "판금가공", positions: [6, 6, 7] },
      { keyword: "스마트공장", positions: [12, 10, 9] },
      { keyword: "수배전반", positions: [4, 4, 5] },
    ];
    for (const { keyword, positions } of kwData) {
      for (let i = 0; i < positions.length; i++) {
        await prisma.keywordRank.create({
          data: { workspaceId: ws.id, keyword, position: positions[i], previousPosition: i > 0 ? positions[i - 1] : null, postUrl: "https://blog.flowhub.local", postTitle: `${keyword} 포스팅`, trackedAt: day(-(positions.length - 1 - i)) },
        });
      }
    }

    console.log("✅ ERP 데모 시드 완료: 발주 2, 통합주문 6, 단가 10, 재고 8, 전달사항 3, 문자 2, 메일 6, 키워드 4");
  }
} catch (err) {
  console.log("⚠️ ERP 시드 실패 (서버 기동 계속):", err.message);
}
