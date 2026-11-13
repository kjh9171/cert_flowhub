# AGENTS.md — FlowHub

개인 일정·프로젝트/작업 배분·팀 협업·지식 베이스를 통합한 한국어 중심 풀 도커 협업 플랫폼.
모노레포(pnpm-workspace.yaml) — `apps/frontend`(Next.js 14) · `apps/backend`(Express+TS, Prisma).

---

## 실행/검증 (가장 먼저 할 일)

```bash
cp .env.example .env          # .env는 gitignore — 절대 커밋 금지
docker compose up -d --build  # db push + 시드 자동 실행 후 기동
docker compose ps             # 모두 healthy 인지 확인
```

- 접속: **http://localhost:9090** (Nginx, 권장) 또는 **http://localhost:3100** (프론트 직접)
- 시드 계정: `admin@flowhub.local` / `admin123` (데모: `demo@`, `jihoon@`, `yuna@flowhub.local` — 모두 `admin123`)
- 헬스체크: `curl http://localhost:4100/health`

포트(`.env`): 프론트 3100 · 백엔드 4100 · Nginx 9090 · Postgres 55432→5432 · Redis 6479→6379.

---

## 백엔드 명령 (`apps/backend`)

```bash
npx tsc --noEmit      # 타입체크 (또는 npm run build)
npm test              # jest — supertest 통합 테스트 (아래 주의)
npm run dev           # ts-node-dev (docker 없이 실행)
```

- `npm test`는 **실 Postgres+Redis가 필요**합니다. `src/main.ts`를 import 시 `server.listen(PORT)`이 즉시 실행되고, Prisma는 `db push`로 스키마가 반영되어 있어야 통과합니다. CI는 `prisma db push --accept-data-loss --skip-generate` 후 `npm test`를 실행합니다.
- **스키마 반영은 `db push` 방식** — `prisma/migrations/`가 없으므로 루트 스크립트 `npm run db:migrate`(migrate deploy)는 실패합니다. 스키마 변경은 `schema.prisma` 수정 → 컨테이너 기동 시 entrypoint가 `prisma db push --accept-data-loss --skip-generate`로 반영합니다.
- 시드는 **컨테이너 기동 시 자동 실행(멱등)** — admin이 이미 있으면 즉시 종료. 수동 실행: `docker compose exec flowhub-backend node prisma/seed.mjs`

## 프론트엔드 명령 (`apps/frontend`)

```bash
npx tsc --noEmit      # 타입체크
npm run lint          # next lint
npm run build         # 프로덕션 빌드 (CI의 유일한 프론트 검증)
```

- 테스트 인프라 없음. 검증은 `npx tsc --noEmit` + `npm run build` + 브라우저 확인.
- 경로 별칭 `@/*` → `./src/*`.

---

## 실행 구조의 비직관적 사실 (모를 때 반드시 깨짐)

1. **브라우저 → API**: 프론트는 `/api`만 호출하고, Next rewrites가 `API_PROXY_TARGET`(기본 `http://flowhub-backend:4000`)으로 서버사이드 프록시합니다. 브라우저에서는 CORS가 발생하지 않습니다.
2. **브라우저 → Socket.io**: Next rewrites는 WebSocket을 프록시하지 **않습니다**. 접속 환경에 따라 소켓 주소가 다릅니다:
   - Nginx(:9090) 경유: `/socket.io`가 WS 업그레이드 프록시됨 → `NEXT_PUBLIC_SOCKET_URL`을 **비워두면** `window.location.origin`으로 동일 출처 연결 (권장).
   - 프론트 직접(:3100) 접속: `NEXT_PUBLIC_SOCKET_URL=http://localhost:4100`(기본값)으로 **백엔드에 직통 연결** — `CORS_ORIGIN`에 `http://localhost:3100`을 포함해야 합니다.
3. **`CORS_ORIGIN`은 콤마 구분 목록**이며 Express(`cors()`)와 Socket.io(`initSocket`)가 동일 변수를 공유합니다.
4. **`NEXT_PUBLIC_*`는 빌드 시점에 인라인**됩니다 — 값을 바꿔도 재빌드 전에는 반영되지 않습니다 (`docker compose up -d --build flowhub-frontend`).
5. **`/sw.js`(서비스 워커)는 `/api`·`/socket.io`·`/uploads`를 캐시하면 안 됩니다.** v3에서 stale-while-revalidate가 최신 작업 상태를 한 세대씩 늦게 보여주는 치명적 버그가 수정되었습니다. API GET을 SW 캐시에 넣지 마세요.
6. **백엔드 entrypoint**는 `prisma db push --accept-data-loss --skip-generate && node prisma/seed.mjs && node dist/main.js`를 실행합니다. push는 손실 플래그를 사용하므로 운영 스키마 작업 전 백업(`./scripts/backup.sh`)을 권장합니다.

## 아키텍처 요점

- 백엔드 진입점 `apps/backend/src/main.ts`: 라우트 등록(`./routes`), `initSocket(server)`을 **import 시점에** 호출, 그리고 `server.listen(PORT)`도 즉시 실행됩니다. 모듈 하나를 import해도 서버가 뜹니다.
- 실시간 구조: `realtime/socket.ts` — JWT 인증 미들웨어 → `user:{userId}` 룸에 join. Presence는 Redis INCR/DECR + `flowhub:presence` Pub/Sub로 전파 (`presence:refresh` 하트비트 60초, TTL 180초). 알림은 `notify.ts`의 `pushToUser`로 룸에 emit.
- GitHub Webhook: `middleware/webhook.ts` (HMAC-SHA256 + 원본 rawBody) → `integration.routes.ts`가 Badge 생성 → `badge:updated` 브로드캐스트.
- 인증: JWT를 `localStorage("flowhub_token")`에 저장. axios 인터셉터가 401 → 토큰 삭제 + `/login` 리다이렉트.
- i18n: 사이드바 등 일부 네비게이션만 `lib/i18n.tsx`(KO/EN) 사용, **나머지 UI 문자열은 하드코드된 한국어**입니다.

## 작업 시 주의

- 빌드/런타임 종속성: 백엔드는 Postgres+Redis **없이** 기동은 되지만 Socket.io 연결/테스트는 실패합니다. lazyConnect만 부분 적용됨 (`redisSubscriber`는 즉시 연결).
- **lockfile 혼재**: 루트는 `pnpm-lock.yaml`(pnpm workspace)인데 Dockerfile/CI는 **npm**을 사용하며, `apps/*`에는 lockfile이 없습니다. CI의 `npm ci`는 현재 잠금파일 부재로 실패할 수 있습니다. 의존성 추가 시 실제 빌드 경로(Docker npm)를 검증하세요.
- `pnpm-workspace.yaml`의 `allowBuilds` 값은 `set this to true or false` 플레이스홀더 그대로입니다 (무시해도 됨).
- 커밋 스타일: `feat:`/`fix:` 접두사 + 한국어 본문. 브랜치 `main`에 직접 푸시.
- `.env`는 커밋 금지. `*.tsbuildinfo`는 gitignore됨.
- 프론트 mock 데이터는 없앴습니다 — 화면에 예시 데이터가 보이면 **API 응답/프록시를 의심**하세요 (`/api` 404 → 로그인 401 루프가 과거에 있었음).

## ERP 확장 구조 (Step 1~4 완료)

- ERP 도메인은 `schema.prisma` 하단 (`OrderNote`, `OrderItem`, `MarketOrder`, `HandoverMemo`, `PriceItem`, `InventoryItem`, `InventoryLog`, `DrawingFile`, `SmsThread/SmsMessage`, `BusinessEmail`, `KeywordRank`, `AuditLog`)에 추가되어 있으며 **모든 ERP 라우트는 `resolveWorkspaceId`(워크스페이스 멤버십 검증)를 강제**합니다.
- 백엔드 모듈: `src/modules/{orders, market-orders, inventory, price-items, handover-memos, drawings, sms, emails, keywords, audit-logs}` → `src/routes/index.ts`에 등록됨.
- 프론트 ERP 페이지: `/orders`(발주+A4 인쇄), `/market-orders`, `/handover-memos`, `/price-items`, `/inventory`, `/drawings`, `/sms`, `/mail`, `/keywords`. 공용 컴포넌트 `src/components/erp/` (`labels.ts`, `SlideOver`, `OrderPrintSheet`), 사이드바는 [협업 & 프로젝트]/[수주 & 현장 운영]/[관리] 3그룹.
- **DXF→SVG 변환은 자체 파서**(`src/lib/dxf.ts`, LINE/CIRCLE/ARC/LWPOLYLINE/TEXT만 지원)로 백엔드가 변환 후 `/uploads/drawings/`에 저장. DWG/AI는 변환 불가(원본만 보관, `status: UNSUPPORTED`).
- 메일→발주 전환(`POST /emails/:id/to-order`)은 거래처명=fromName, 첫 품목=제목으로 OrderNote를 생성합니다.
- 감사 로그는 `lib/audit.ts`의 `logAudit()`을 ERP 변경 엔드포인트에서 best-effort 호출합니다 (`GET /audit-logs?entity=INVENTORY`).
- 문자 발송은 **시뮬레이션**(실제 통신사 게이트웨이 미연동). 수신은 `POST /sms/threads/:id/receive`로 시뮬레이션 가능.
- 운영 배포는 `docker-compose.prod.yml` (DB/Redis/앱 포트 비공개, Nginx만 공개, 로그 로테이션). 기본 `docker-compose.yml`은 개발용 (포트 전부 공개).
- 시드 ERP 데모 데이터를 포함합니다 (발주 2건, 통합주문 6건, 재고 8건 등). 기본 시드와 독립적으로 멱등 실행됨.
- 주의: A4 인쇄 버튼(`window.print()`)을 브라우저 자동화로 클릭하면 네이티브 인쇄 대화상자가 열려 페이지 JS가 블록됩니다 (orca 재개 불가 — 인쇄 검증 시 자동화 클릭 금지).

## 문서
- `README.md` — 포트/실행/환경변수/서비스워커 정책/수동 E2E 체크리스트 (현행, 신뢰 가능)
- `docs/ui-ux-design.md` — 디자인 시스템 상세
- CI: `.github/workflows/ci.yml` — backend(tsc+jest, db push 필요) · frontend(build) · docker 빌드. `npm ci` 부재 lockfile 참고.
