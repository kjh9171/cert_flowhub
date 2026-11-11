# FlowHub — 통합 협업 플랫폼

> 개인 일정 관리 · 프로젝트/작업 배분 · 팀 협업 · 개인/팀 지식 베이스를 하나로 통합한 한국어 중심의 풀 도커(Full Docker) 웹 플랫폼.

---

## 1. 프로젝트 개요 (Planning)

### 1.1 목표
- 협업 툴 '플로우(Flow)' 스타일의 직관적인 UX를 갖춘 통합 플랫폼 구축
- 개인 일정·프로젝트/작업 배분·팀 협업·개인 및 팀 지식 베이스를 단일 워크스페이스에서 제공
- 모든 서비스가 `docker compose` 단일 명령으로 즉시 실행 가능

### 1.2 핵심 기능
| 영역 | 기능 |
|------|------|
| 일정/작업 | 간트 차트(드래그·의존성), 칸반, 캘린더, 피드 뷰 전환 / 담당자·우선순위·진척도·상태 관리 |
| 협업 | 프로젝트 피드·댓글·멘션·파일 첨부, 실시간 알림 |
| 연동 Badge | 사용자 상태(온라인/자리비움/다른 업무 중/오프라인), GitHub 커밋/PR·CI/CD·외부 API 상태(성공/진행/실패) 실시간 반영 |
| 지식 베이스 | 개인/팀 공간 분리, 1-Click 팀 승격, Markdown WYSIWYG 에디터, 버전 관리, TOC 자동 생성, 관련 작업 링크 |
| 검색 | 문서·작업·피드·파일 통합 검색(초성/키워드) |

### 1.3 사용자 역할
- `ADMIN` / `MEMBER` / `VIEWER` (워크스페이스·프로젝트 단위 권한 분리)

---

## 2. 시스템 아키텍처

### 2.1 구성도 (Architecture Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Browser                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS (80/443)
┌──────────────────────────────▼──────────────────────────────────────┐
│                    flowhub-proxy (Nginx)                             │
│   /          -> flowhub-frontend:3000                               │
│   /api       -> flowhub-backend:4000                                │
│   /socket.io -> flowhub-backend:4000 (WebSocket upgrade)            │
└────────┬──────────────────────────────┬──────────────────────────────┘
         │                              │
┌────────▼────────┐            ┌────────▼────────┐
│ flowhub-frontend│◄──WS──────►│ flowhub-backend │
│  Next.js 14     │            │  Node.js + TS   │
│  App Router     │            │  Express        │
│  Tailwind CSS   │            │  Socket.io      │
│  Zustand        │            │  Prisma ORM     │
└─────────────────┘            └────┬───────┬────┘
                                    │       │
                           ┌────────▼┐  ┌───▼────┐
                           │flowhub-db│  │flowhub-│
                           │Postgres16│  │ redis  │
                           └─────────┘  └────────┘
```

### 2.2 기술 스택
| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14 (App Router, TS), Tailwind CSS, Lucide React, Zustand, gantt-task-react, @dnd-kit, react-markdown, socket.io-client, axios |
| Backend | Node.js 20 (Express + TS), Prisma ORM, Socket.io, JWT, bcryptjs |
| Database | PostgreSQL 16 (메인 DB), Redis 7 (세션/캐시/Pub-Sub) |
| Infra | Docker Compose, Nginx (Reverse Proxy) |

### 2.3 디렉토리 구조

```
cert_flowhub/
├── docker-compose.yml
├── .env.example
├── README.md
├── package.json / pnpm-workspace.yaml
├── nginx/nginx.conf
├── docs/ui-ux-design.md
├── apps/
│   ├── frontend/                 # Next.js Web App (Port 3000)
│   │   ├── src/app/(auth)/login  # 인증
│   │   ├── src/app/(dashboard)/  # 대시보드/작업/피드/지식
│   │   ├── src/components/       # UI/레이아웃/기능 컴포넌트
│   │   ├── src/stores/           # Zustand
│   │   └── src/lib/              # api, socket, utils
│   └── backend/                  # Node.js API + WS (Port 4000)
│       ├── prisma/schema.prisma
│       └── src/
│           ├── lib/              # prisma, redis, jwt
│           ├── middleware/       # auth, error
│           ├── modules/          # auth, user, workspace, project, task, feed, knowledge, integration, notification
│           ├── realtime/         # socket gateway
│           └── routes/           # 라우트 등록
└── packages/ (shared, 예정)
```

---

## 3. 데이터 모델 (Prisma)

핵심 엔티티: `User`, `Workspace`, `WorkspaceMember`, `Project`, `ProjectMember`, `Task`, `TaskAssignee`, `TaskDependency`, `FeedPost`, `Comment`, `Mention`, `Attachment`, `KnowledgeArticle`, `KnowledgeVersion`, `KnowledgeLink`, `IntegrationBadge`, `Notification`.

주요 Enum: `UserRole`, `UserStatus`, `TaskStatus`, `TaskPriority`, `FeedPostType`, `IntegrationStatus`, `IntegrationEventType`, `ProjectViewType`, `KnowledgeVisibility`, `DependencyType`.

상세 스키마: `apps/backend/prisma/schema.prisma`

---

## 4. API & 실시간 이벤트

### 4.1 REST API (prefix `/api`)
| 모듈 | 주요 엔드포인트 |
|------|----------------|
| auth | `POST /auth/register`, `POST /auth/login` |
| users | `GET /users/me`, `PATCH /users/me/status`, `GET /users` |
| workspaces | `GET/POST /workspaces`, `GET/PATCH /workspaces/:id` |
| projects | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id` |
| tasks | `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/:id`, `POST/DELETE /tasks/:id/dependencies` |
| feed | `GET/POST /feed`, `GET/PATCH/DELETE /feed/:id`, `POST /feed/:id/comments` |
| knowledge | `GET/POST /knowledge`, `GET/PATCH/DELETE /knowledge/:id`, `POST /knowledge/:id/promote`, `GET /knowledge/:id/versions` |
| integrations | `GET/POST/PATCH/DELETE /integrations/badges`, `POST /integrations/webhook/github` |
| notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` |

### 4.2 Socket.io 이벤트
- Client → Server: `user:status`, `task:updated`, `badge:updated`, `notification:new`
- Server → Client (broadcast): `task:updated`, `badge:updated`, `user:status`, `notification:new`

### 4.3 인증
- JWT Bearer 토큰 (`Authorization: Bearer <token>`), 만료 `JWT_EXPIRES_IN` (기본 7d)

---

## 5. 실행 방법

```bash
# 1. 환경 변수 준비
cp .env.example .env

# 2. 전체 스택 실행
docker compose up -d --build

# 3. DB 마이그레이션 (최초 1회)
docker compose exec flowhub-backend npx prisma migrate deploy

# 4. 접속
# http://localhost        (Nginx -> Frontend)
# http://localhost/api    (Backend API)
```

개발용 핫 리로드는 `docker-compose.override.yml` 추가 후 `docker compose up`.

---

## 6. UI/UX 설계

Clean Light Mode 중심. 디자인 토큰, 레이아웃(AppShell/Sidebar/Topbar/RightPanel), Badge, Gantt/Kanban/Calendar/Feed/KnowledgeEditor/GlobalSearch/Notification 컴포넌트 명세는 `docs/ui-ux-design.md` 참고.

---

## 7. 개발 단계 (Roadmap)

- **1단계 (완료)**: 아키텍처, docker-compose, Prisma 스키마, UI/UX 설계서
- **2단계 (완료)**: Next.js 프론트엔드 모듈 (간트/칸반/캘린더/피드/지식 베이스/검색/알림)
- **3단계 (완료)**: Prisma REST API + Socket.io 실시간 연동 + JWT 인증 + GitHub Webhook
- **4단계 (예정)**: Redis 캐싱/세션, RBAC 가드, 파일 업로드, 테스트, CI/CD

---

## 8. 라이선스

Private / Internal use.
