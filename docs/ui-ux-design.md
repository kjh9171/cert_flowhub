# FlowHub UI/UX 컴포넌트 설계서

> Clean Light Mode 중심. 여백 활용, 명확한 보더라인, 상태별 컬러 Badge.

## 1. 디자인 토큰 (Design Tokens)

### 1.1 컬러 팔레트 (Tailwind 확장)

| 토큰 | 값 | 용도 |
|------|----|------|
| `brand.primary` | `#2563EB` (blue-600) | 주요 액션, 활성 메뉴 |
| `brand.primary-soft` | `#DBEAFE` (blue-100) | 활성 배경 |
| `surface.base` | `#FFFFFF` | 카드/패널 배경 |
| `surface.subtle` | `#F8FAFC` (slate-50) | 페이지 배경 |
| `surface.muted` | `#F1F5F9` (slate-100) | 호버/비활성 |
| `border.default` | `#E2E8F0` (slate-200) | 기본 보더 |
| `border.strong` | `#CBD5E1` (slate-300) | 강조 보더 |
| `text.primary` | `#0F172A` (slate-900) | 본문 |
| `text.secondary` | `#475569` (slate-600) | 보조 텍스트 |
| `text.muted` | `#94A3B8` (slate-400) | 플레이스홀더 |
| `status.success` | `#16A34A` (green-600) | 성공/완료 |
| `status.info` | `#2563EB` (blue-600) | 진행중 |
| `status.warning` | `#D97706` (amber-600) | 경고/일시정지 |
| `status.danger` | `#DC2626` (red-600) | 실패/긴급 |
| `status.neutral` | `#64748B` (slate-500) | 대기/오프라인 |

### 1.2 간격/라운드/그림자
- spacing: 4px 기반 (Tailwind 기본)
- radius: `rounded-lg` (8px) 카드, `rounded-md` (6px) 버튼/입력, `rounded-full` Badge
- shadow: `shadow-sm` 카드, `shadow-md` 모달/팝오버

### 1.3 타이포그래피
- 폰트: `Pretendard` (한글) / `Inter` (영문) fallback system-ui
- 본문 14px (text-sm), 제목 18~24px, 캡션 12px

## 2. 레이아웃 구조

```
┌──────────────────────────────────────────────────────────────────────┐
│ Topbar (h-14)  [Logo] [Workspace Switcher] [Global Search] [Status] [Notif] [Avatar] │
├────────┬─────────────────────────────────────────────┬───────────────┤
│        │                                             │               │
│ Sidebar│              Main Content                   │  Right Panel  │
│ (w-60) │                                             │  (w-80, opt)  │
│        │  ┌─ Page Header (title + view switcher) ─┐  │               │
│ - Home │  │                                        │  │ - Detail     │
│ - Proj │  │  Content Area (scroll)                 │  │ - Activity   │
│ - Tasks│  │                                        │  │ - Comments   │
│ - Feed │  │                                        │  │               │
│ - Know │  └────────────────────────────────────────┘  │               │
│ - Set  │                                             │               │
└────────┴─────────────────────────────────────────────┴───────────────┘
```

- Sidebar: 접기 가능 (collapsed: w-16, 아이콘만)
- Right Panel: 작업/문서 상세 슬라이드 패널 (overlay on mobile)
- 반응형: < 1024px Sidebar 오버레이, Right Panel 풀스크린 모달

## 3. 핵심 컴포넌트 설계

### 3.1 AppShell (레이아웃)
- `components/layout/AppShell.tsx`
- 구성: `Topbar`, `Sidebar`, `MainContent`, `RightPanelSlot`
- Zustand: `useLayoutStore` (sidebarCollapsed, rightPanelOpen, rightPanelContent)

### 3.2 Topbar
- Logo + WorkspaceSwitcher (드롭다운)
- GlobalSearch (Cmd/Ctrl+K 단축키, 모달)
- IntegrationStatusSummary (연동 Badge 집계: 성공/진행/실패 카운트)
- UserStatusBadge (현재 사용자 상태, 클릭 시 상태 변경 메뉴)
- NotificationBell (미읽음 카운트)
- UserAvatarMenu

### 3.3 Sidebar
- 메뉴: 대시보드, 프로젝트, 작업, 피드, 지식 베이스, 설정
- 프로젝트 빠른 접근 목록 (즐겨찾기)
- 하단: 사용자 상태 + "새 작업" FAB

### 3.4 UserStatusBadge
```
┌────────────┐
│ ● 온라인   │  (dot color: green/amber/blue/slate)
└────────────┘
```
- Props: `status: UserStatus`, `size: 'sm'|'md'`, `showLabel`, `interactive`
- 색상: ONLINE green-500, AWAY amber-500, BUSY blue-500, OFFLINE slate-400
- interactive 시 클릭 → 상태 선택 Popover

### 3.5 IntegrationBadge (연동 상태)
```
┌──────────────────────────────┐
│ [GitHub 아이콘] PR #42       │
│ ● 진행중  (blue)             │
└──────────────────────────────┘
```
- Props: `status`, `eventType`, `title`, `targetUrl?`, `size`
- 색상: SUCCESS green, IN_PROGRESS blue (pulse 애니메이션), FAILED red, PENDING slate
- 클릭 시 targetUrl 새 탭 오픈
- 실시간 Socket 이벤트로 상태 업데이트 → pulse + 토스트

### 3.6 ViewSwitcher (뷰 전환)
- 탭 형태: 피드 | 칸반 | 캘린더 | 간트
- URL query `?view=` 동기화
- 활성 탭: brand.primary underline

### 3.7 GanttChart (간트 차트)
- 라이브러리: `gantt-task-react` (또는 Frappe Gantt)
- 구성:
  - 좌측: 작업 트리 (이름, 담당자 아바타, 진행률)
  - 우측: 타임라인 (일/주/월 스케일 전환)
  - 바: 시작~마감, 진행률 오버레이, 우선순위 좌측 컬러 스트라이프
  - 의존성: SVG 화살표 (FS/SS/FF/SF)
  - 드래그: 기간 이동/리사이즈 → API PATCH + Socket broadcast
- 레이어: 프로젝트별 색상 (Project.color) 중첩 토글
- 필터: 개인 일정 / 팀 프로젝트 / 담당자 / 상태

#### Gantt 인터랙션
- 호버: 툴팁 (제목, 담당자, 기간, 진행률)
- 클릭: Right Panel 상세
- 우클릭 컨텍스트 메뉴: 상태 변경, 담당자, 의존성 추가
- 더블클릭: 인라인 편집 (제목)

#### Gantt 데이터 매핑
```
Task -> {
  id, name: title, start: startDate, end: endDate,
  progress, type: 'task'|'milestone'|'project',
  dependencies: TaskDependency[].dependsOnTaskId,
  styles: { backgroundColor: priorityColor, progressColor }
}
```

### 3.8 KanbanBoard
- 컬럼: 요청 / 진행 / 일시정지 / 완료
- 카드: 제목, 우선순위 Badge, 담당자 아바타 스택, 마감일, 진행률, 연동 Badge 미니
- 드래그 앤 드롭 (@dnd-kit) → 상태 변경 API

### 3.9 CalendarView
- 월/주/일 전환
- 이벤트: 작업 (색상=우선순위), 개인 일정
- 드래그로 날짜 변경

### 3.10 FeedPostCard
- 헤더: 아바타, 이름, 타입 Badge (요청/업무/일지/공유/공지), 시간
- 본문: Markdown 렌더 (react-markdown)
- 멘션 하이라이트 (@name)
- 첨부파일 미리보기
- 액션: 댓글, 좋아요/리액션, 공유, 더보기
- 댓글 스레드 (중첩 1단)

### 3.11 KnowledgeEditor
- 에디터: Tiptap (Markdown WYSIWYG) 또는 @uiw/react-md-editor
- 사이드바: 목차(TOC) 자동 생성 (h1~h3)
- 툴바: 굵게, 기울임, 제목, 리스트, 코드, 링크, 이미지, 테이블
- 버전 히스토리 드로어
- "팀으로 승격" 버튼 (isPersonal → visibility=TEAM)

### 3.12 GlobalSearch (Cmd+K)
- 모달: 입력창 + 카테고리 탭 (전체/작업/문서/피드/파일)
- 결과: 타입 아이콘, 제목, 스니펫 (하이라이트)
- 초성 검색 지원 (한글)

### 3.13 NotificationPanel
- 드롭다운 리스트
- 타입별 아이콘/색상
- 읽음 처리, 전체 읽음

## 4. 반응형 & 접근성
- 모바일: Sidebar 드로어, Right Panel 풀스크린
- 키보드: 포커스 링 (`focus-visible:ring-2`), 단축키 (Cmd+K, Cmd+N)
- ARIA: role/aria-label, 라이브 영역 for 실시간 알림

## 5. 실시간 UX
- Socket.io 이벤트:
  - `task:updated` → 카드/Badge/간트 바 갱신 + 토스트(다른 사용자 수정 시)
  - `badge:updated` → IntegrationBadge pulse + 색상 변경
  - `user:status` → UserStatusBadge 갱신
  - `notification:new` → 벨 카운트 + 토스트
- Optimistic UI: 드래그/편집 즉시 반영, 실패 시 롤백 + 에러 토스트

## 6. 컴포넌트 파일 매핑

| 컴포넌트 | 경로 |
|----------|------|
| AppShell | src/components/layout/AppShell.tsx |
| Topbar | src/components/layout/Topbar.tsx |
| Sidebar | src/components/layout/Sidebar.tsx |
| RightPanel | src/components/layout/RightPanel.tsx |
| UserStatusBadge | src/components/badge/UserStatusBadge.tsx |
| IntegrationBadge | src/components/badge/IntegrationBadge.tsx |
| ViewSwitcher | src/components/common/ViewSwitcher.tsx |
| GanttChart | src/components/gantt/GanttChart.tsx |
| KanbanBoard | src/components/kanban/KanbanBoard.tsx |
| CalendarView | src/components/calendar/CalendarView.tsx |
| FeedPostCard | src/components/feed/FeedPostCard.tsx |
| KnowledgeEditor | src/components/knowledge/KnowledgeEditor.tsx |
| GlobalSearch | src/components/search/GlobalSearch.tsx |
| NotificationPanel | src/components/notification/NotificationPanel.tsx |
