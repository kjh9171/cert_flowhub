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
| 일정/작업 | 간트 차트(드래그·의존성, 기간/진척도 드래그 시 즉시 저장), 칸반(드래그 앤 드롭, 빈 컬럼 드롭 지원), 캘린더, 피드 뷰 전환 / 담당자·우선순위·진척도·상태 관리 |
| 협업 | 프로젝트 피드·댓글·멘션·파일 첨부, 실시간 알림 (GitHub PR/CI/CD Webhook → Badge 브로드캐스트) |
| 연동 Badge | 사용자 상태(온라인/자리비움/다른 업무 중/오프라인), GitHub 커밋/PR·CI/CD·외부 API 상태(성공/진행/실패) 실시간 반영 |
| 지식 베이스 | 개인/팀 공간 분리, 1-Click 팀 승격, Markdown WYSIWYG 에디터, TOC 자동 생성, `?article=` 딥링크 |
| 검색 | 문서·작업·피드·파일 통합 검색 (⌘K / Ctrl+K), 결과 클릭 시 `?task=` / `?article=` 딥링크로 해당 상세 자동 오픈 |
| UX | 다크모드, 한/영 i18n, 실시간 뱃지(미읽음 수), 반응형(모바일 사이드바) |
| 발주/수주 | 발주노트(품목·공급가/VAT·미수금·납기 D-Day) + **A4 발주서 인쇄**, 통합주문(스마트스토어/쿠팡, 송장 일괄 등록, 픽업 주문서 출력) |
| 재고/단가 | 재고 +/- 즉시 조정, 안전재고 미만 필터, 이력(InventoryLog), 단가표 카테고리별 검색·인라인 수정 |
| 현장/협업 | 전달사항(@발주 멘션 연결·사진 첨부·완료 체크), 도면 뷰어(DXF→SVG 자동 변환·줌/팬·두 점 치수 측정) |
| 커뮤니케이션 | 비즈니스 문자(MMS 첨부·안읽음 필터), 메일(자동 라벨링: 미처리/거래처/세금계산서 + **원클릭 발주 전환**), 영업 키워드 순위 트래커 + 추천 |
| 운영 | AuditLog(단가/재고/발주 상태 변경 이력), 워크스페이스 멤버십 기반 테넌트 격리 |

### 1.3 사용자 역할
- `ADMIN` / `MEMBER` / `VIEWER` (워크스페이스·프로젝트 단위 권한 분리). ERP API는 모든 요청에서 워크스페이스 멤버십을 검증합니다.

---

## 2. 시스템 아키텍처

### 2.1 구성도 (Architecture Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client Browser                             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
        ┌──────────────────────┴───────────────────────┐
        │  http://localhost:9090  (Nginx, 권장 진입점)  │   ← HTTP_PORT
        │  http://localhost:3100  (Next.js 직접 접속)   │   ← FRONTEND_PORT
        └──────────────────────┬───────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                    flowhub-proxy (Nginx) — :9090                     │
│   /          -> flowhub-frontend:3000                               │
│   /api       -> flowhub-backend:4000                                │
│   /socket.io -> flowhub-backend:4000 (WebSocket upgrade)            │
│   /uploads   -> flowhub-backend:4000 (정적 파일)                    │
└────────┬──────────────────────────────┬──────────────────────────────┘
         │                              │
┌────────▼────────┐            ┌────────▼────────┐
│ flowhub-frontend│  WS(직통)  │ flowhub-backend │
│  Next.js 14     │◄──────────►│  Node.js + TS   │
│  App Router     │  (아래     │  Express        │
│  Tailwind CSS   │   2.2 참고)│  Socket.io      │
│  Zustand        │            │  Prisma ORM     │
└─────────────────┘            └────┬───────┬────┘
                                     │       │
                            ┌────────▼┐  ┌───▼────┐
                            │flowhub-db│  │flowhub-│
                            │Postgres16│  │ redis  │
                            └─────────┘  └────────┘
```

### 2.2 실시간(WebSocket) 연결 방식
- 브라우저 → 백엔드 **직통 연결**: `NEXT_PUBLIC_SOCKET_URL` (기본 `http://localhost:4100`)
- Nginx 경유(:9090) 배포 시에는 비워두면 `window.location.origin` 기반 동일 출처로 연결됨
- 백엔드 Socket.io는 JWT 미들웨어로 인증 (`auth: { token }`), `user:{id}` 룸으로 개인 알림 타겟팅
- Presence: Redis INCR/DECR + Pub/Sub(`flowhub:presence`)으로 접속 상태(ONLINE/AWAY/BUSY/OFFLINE) 실시간 브로드캐스트

### 2.3 기술 스택
| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 14 (App Router, TS), Tailwind CSS, Lucide React, Zustand, gantt-task-react, @dnd-kit, react-markdown, socket.io-client, axios |
| Backend | Node.js 20 (Express + TS), Prisma ORM, Socket.io, JWT, bcryptjs |
| Database | PostgreSQL 16 (메인 DB), Redis 7 (캐시/Pub-Sub/Presence) |
| Infra | Docker Compose, Nginx (Reverse Proxy) |

### 2.4 포트 매핑 (로컬 개발 기준, `.env`)
| 서비스 | 호스트 포트 | 비고 |
|--------|------------|------|
| Nginx 프록시 (권장 진입점) | `HTTP_PORT=9090` | `/`→프론트, `/api`→백엔드, `/socket.io`→WS 업그레이드 |
| Frontend (Next.js 직접) | `FRONTEND_PORT=3100` | 단독 접속 시에도 `/api/*` 는 Next rewrites 로 백엔드 프록시 |
| Backend API (직접) | `BACKEND_PORT=4100` | `/api`, `/socket.io`, `/uploads`, `/health` |
| PostgreSQL | `POSTGRES_PORT=55432` | 컨테이너 내부는 5432 |
| Redis | `REDIS_PORT=6479` | 컨테이너 내부는 6379 |

### 2.5 디렉토리 구조

```
cert_flowhub/
├── docker-compose.yml
├── .env.example
├── README.md
├── package.json / pnpm-workspace.yaml
├── nginx/nginx.conf
├── docs/ui-ux-design.md
├── apps/
│   ├── frontend/                 # Next.js Web App
│   │   ├── src/app/(auth)/login  # 인증
│   │   ├── src/app/(dashboard)/  # 대시보드/피드/작업/캘린더/간트/지식/팀/설정/프로젝트
│   │   ├── src/components/       # UI/레이아웃/기능 컴포넌트
│   │   ├── src/stores/           # Zustand (taskStore, userStore, layoutStore)
│   │   ├── src/lib/              # api, socket, i18n, utils
│   │   └── public/sw.js          # Service Worker (아래 주의사항 참고)
│   └── backend/                  # Node.js API + WS
│       ├── prisma/schema.prisma
│       ├── prisma/seed.mjs       # 데모 시드 (멱등)
│       ├── src/
│       │   ├── lib/              # prisma, redis, jwt, notify
│       │   ├── middleware/       # auth, webhook(HMAC)
│       │   ├── modules/          # auth, user, workspace, project, task, feed, knowledge, integration, notification, search, orders, market-orders, inventory, price-items, handover-memos, drawings, sms, emails, keywords, audit-logs
│       │   ├── realtime/         # socket gateway
│       │   └── main.ts           # 라우트 등록 + 부트스트랩
│       └── Dockerfile            # 컨테이너 기동 시 db push + seed 자동 실행 (아래 참고)
└── scripts/                      # backup.sh / restore.sh
```

---

## 3. 데이터 모델 (Prisma)

핵심 엔티티: `User`, `Workspace`, `WorkspaceMember`, `Project`, `ProjectMember`, `Task`, `TaskAssignee`, `TaskDependency`, `FeedPost`, `Comment`, `Mention`, `Attachment`, `KnowledgeArticle`, `KnowledgeVersion`, `KnowledgeLink`, `IntegrationBadge`, `Notification`.

주요 Enum: `UserRole`, `UserStatus`, `TaskStatus`, `TaskPriority`, `FeedPostType`, `IntegrationStatus` (`SUCCESS`/`IN_PROGRESS`/`FAILED`/`PENDING`), `IntegrationEventType`, `ProjectViewType`, `KnowledgeVisibility`, `DependencyType`.

상세 스키마: `apps/backend/prisma/schema.prisma`

---

## 4. API & 실시간 이벤트

### 4.1 REST API (prefix `/api`)
| 모듈 | 주요 엔드포인트 |
|------|----------------|
| auth | `POST /auth/register`, `POST /auth/login` |
| users | `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/status`, `GET /users` |
| workspaces | `GET/POST /workspaces`, `GET/PATCH /workspaces/:id` |
| projects | `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id` |
| tasks | `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/:id`, `POST/DELETE /tasks/:id/dependencies` |
| feed | `GET/POST /feed`, `GET/PATCH/DELETE /feed/:id`, `POST /feed/:id/comments` |
| knowledge | `GET/POST /knowledge`, `GET/PATCH/DELETE /knowledge/:id`, `POST /knowledge/:id/promote`, `GET /knowledge/:id/versions` |
| integrations | `GET/POST/PATCH/DELETE /integrations/badges`, `POST /integrations/webhook/github` (HMAC-SHA256 검증) |
| notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` |
| search | `GET /search?q=` (작업/문서/피드/파일 통합) |
| uploads | `POST /uploads` (multipart, 최대 50MB — Nginx `client_max_body_size` 동일) |
| orders | `GET/POST /orders`, `GET/PATCH/DELETE /orders/:id` (품목 일괄 교체, 상태/결제) |
| market-orders | `GET/POST /market-orders`, `PATCH /market-orders/:id`, `PATCH /market-orders/bulk-ship` |
| inventory | `GET/POST /inventory`, `PATCH /inventory/:id`, `POST /inventory/:id/adjust`, `GET /inventory/:id/logs` |
| price-items | `GET/POST /price-items`, `PATCH /price-items/:id` (인라인 단가 수정) |
| handover-memos | `GET/POST /handover-memos`, `PATCH /handover-memos/:id` (완료 체크) |
| drawings | `GET /drawings`, `POST /drawings` (DXF→SVG 자동 변환), `GET /drawings/:id/svg` |
| sms | `GET /sms/threads`, `GET /sms/threads/:id/messages`, `POST /sms/messages` |
| emails | `GET /emails`, `PATCH /emails/:id`, `POST /emails/:id/to-order` (메일→발주 전환) |
| keywords | `GET /keywords`, `GET /keywords/history`, `POST /keywords/track`, `GET /keywords/recommend` |
| audit-logs | `GET /audit-logs?entity=` |

### 4.2 Socket.io 이벤트
- Client → Server: `user:status`, `task:updated`, `badge:updated`, `notification:new`, `presence:refresh`
- Server → Client (broadcast/room): `task:updated` (`action`: created/updated/deleted), `badge:updated`, `user:status`, `notification:new`
- 연결 시 JWT handshake 인증 (`auth: { token }`), 미인증/만료 연결은 서버가 거부

### 4.3 인증
- JWT Bearer 토큰 (`Authorization: Bearer <token>`), 만료 `JWT_EXPIRES_IN` (기본 7d)
- 시드 계정: `admin@flowhub.local` / `admin123`
  - 데모 계정(`demo@flowhub.local`, `jihoon@flowhub.local`, `yuna@flowhub.local`)도 동일하게 `admin123`을 사용합니다.
  - 시드 계정 비밀번호는 개발용입니다. 운영 환경에서는 반드시 변경하세요.

---

## 5. 실행 방법

```bash
# 1. 환경 변수 준비
cp .env.example .env

# 2. 전체 스택 실행 (최초 기동 시 백엔드 entrypoint가 db push + 시드를 자동 실행)
docker compose up -d --build

# 3. 접속
# http://localhost:9090   (Nginx 프록시 — 권장)
# http://localhost:3100   (프론트엔드 직접)
# http://localhost:4100/api (백엔드 API 직접)
# http://localhost:4100/health (헬스체크)

# 4. 로그인
# admin@flowhub.local / admin123
```

접속만 하면 동작하지 않을 수 있습니다 — **환경 변수(`.env`)를 먼저 채우세요.** 특히:
- `NEXT_PUBLIC_SOCKET_URL`: 브라우저가 소켓 서버에 직결할 주소 (로컬 개발은 `http://localhost:4100`).
  - 비워두면 `window.location.origin`을 사용 → **Nginx(:9090) 경유 접속에서만** 실시간이 동작합니다.
  - Next.js 프론트를 직접(:3100) 열 때는 반드시 `http://localhost:4100`으로 지정하세요.
- `CORS_ORIGIN`: 허용할 프론트엔드 출처 **콤마 구분 목록** (예: `http://localhost:9090,http://localhost:3100,http://localhost:3000`). 백엔드 Express + Socket.io가 공유합니다.
- `NEXT_PUBLIC_API_BASE_URL`: 프론트엔드가 API를 호출할 base URL (`/api` — Next rewrites가 백엔드로 프록시)

개발용 핫 리로드는 `docker-compose.override.yml` 추가 후 `docker compose up`.

### 운영 배포 (Production)

```bash
# 1. 운영 환경 변수 준비 (JWT_SECRET/POSTGRES_PASSWORD/REDIS_PASSWORD 필수 교체)
#    CORS_ORIGIN을 운영 도메인으로 변경
# 2. 필요 시 nginx/certs에 fullchain.pem/privkey.pem 배치 후 nginx.conf의 HTTPS 블록 활성화
# 3. 운영 모드로 기동 (DB/Redis/백엔드/프론트엔드 비공개, Nginx만 80/443 공개)
docker-compose -f docker-compose.prod.yml up -d --build
```

- `docker-compose.prod.yml`: DB/Redis/앱 포트를 호스트에 공개하지 않고, 컨테이너 로그 로테이션(10MB×3) 적용, `POSTGRES_PASSWORD`/`REDIS_PASSWORD`/`JWT_SECRET` 미설정 시 기동 거부.
- 백업: `./scripts/backup.sh` (cron 등록 권장), 복구: `./scripts/restore.sh`

---

## 6. 서비스 워커(Service Worker) 캐시 정책 — 주의

`apps/frontend/public/sw.js` (현재 `flowhub-v3`):
- **`/api/*`, `/socket.io/*`, `/uploads/*`는 절대 캐시하지 않습니다** (네트워크 직행). 이 요청들을 캐시하면 최신 작업 상태가 한 세대씩 늦게 표시되는 치명적 이슈가 있었습니다.
- 페이지 탐색: network-first (실패 시 캐시 폴백)
- 정적 에셋: stale-while-revalidate
- 구 캐시(`flowhub-v1` 등)는 activate 시 자동 삭제됩니다.

SW 동작을 확인하려면 브라우저 개발자 도구 → Application → Service Workers / Cache Storage에서 `flowhub-v3`만 남아있는지 확인하세요.

---

## 7. UI/UX 설계

Clean Light Mode + 다크모드 지원. 디자인 토큰, 레이아웃(AppShell/Sidebar/Topbar/RightPanel), Badge 시스템, Gantt/Kanban/Calendar/Feed/KnowledgeEditor/GlobalSearch/Notification 컴포넌트 명세는 `docs/ui-ux-design.md` 참고.

---

## 8. 검증 체크리스트 (수동 E2E)

아래가 모두 통과하는 상태를 기준으로 삼습니다. 브라우저에서 직접 확인:

- [ ] 로그인(`admin@flowhub.local` / `admin123`) → 대시보드 진입
- [ ] 칸반 뷰: 카드 클릭 → 우측 상세 패널, 드래그(그립) → 컬럼 이동 → **새로고침 없이** 카운트 반영
- [ ] 뷰 전환(피드/칸반/캘린더/간트) — 간트 바 드래그 → 시작일/마감일·진척도 PATCH 저장
- [ ] ⌘K / Ctrl+K → 검색 → 결과 클릭 시 `/tasks?task=`, `/knowledge?article=` 딥링크로 자동 오픈
- [ ] 알림 벨 → 패널, 모두 읽음, `notification:new` 실시간 도착
- [ ] "새 작업" 모달 → 생성 → 즉시 칸반에 카드 표시 (소켓 `task:updated{action:created}`)
- [ ] 다크모드 토글, KO↔EN 토글
- [ ] Nginx(:9090)와 프론트(:3100) 양쪽에서 실시간 갱신 모두 동작
- [ ] 발주노트: 품목 추가→저장→인쇄(A4), 메일→발주 전환
- [ ] 통합주문: 미발송 필터 → 체크 → 송장 일괄 등록
- [ ] 재고: +/- 조정 → 안전재고 미만 품목 하이라이트
- [ ] 도면: DXF 업로드 → SVG 생성 → 줌/팬/두 점 측정

---

## 9. 개발 단계 (Roadmap)

- **1단계 (완료)**: 아키텍처, docker-compose, Prisma 스키마, UI/UX 설계서
- **2단계 (완료)**: Next.js 프론트엔드 모듈 (간트/칸반/캘린더/피드/지식 베이스/검색/알림)
- **3단계 (완료)**: Prisma REST API + Socket.io 실시간 연동 + JWT 인증 + GitHub Webhook
- **4단계 (완료)**: UI 깨짐/mock 데이터 전면 정리, ⌘K 검색·딥링크, 간트 드래그 저장, 다크모드, i18n, 서비스 워커 API 캐시 제거
- **4.5단계 (완료)**: ERP 확장 — 발주노트(A4 인쇄)/통합주문/단가표/재고관리/전달사항/도면 뷰어(DXF→SVG)/문자/메일(발주 전환)/영업 키워드 + 통합 월간 캘린더 + AuditLog + 워크스페이스 격리 + `docker-compose.prod.yml`
- **5단계 (예정)**: RBAC 세분화, 파일 업로드 악성코드 검증, 자동화 테스트, CI/CD 강화, HTTPS 자동화

### 9.1 알려진 이슈 / 운영 주의
- `NEXT_PUBLIC_*` 환경 변수는 **빌드 시점에 인라인**됩니다. 값을 바꾸면 `docker compose up -d --build flowhub-frontend`로 재빌드해야 반영됩니다.
- SW 캐시를 강제로 지우지 않으려면 브라우저를 한 번 새로고침하세요 (SW는 network-first/바이패스라 최신 상태를 반환합니다).
- `.env`는 커밋 대상이 아닙니다 (`.gitignore` 처리됨). 비밀값은 `.env`로만 관리하세요.

---

## 10. 라이선스

Private / Internal use.
