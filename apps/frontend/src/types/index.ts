// FlowHub 공통 타입 정의 (Frontend)

export type UserRole = "ADMIN" | "MEMBER" | "VIEWER";
export type UserStatus = "ONLINE" | "AWAY" | "BUSY" | "OFFLINE";
export type TaskStatus = "REQUESTED" | "IN_PROGRESS" | "PAUSED" | "DONE" | "CANCELLED";
export type TaskPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type FeedPostType = "REQUEST" | "TASK" | "JOURNAL" | "SHARE" | "ANNOUNCEMENT";
export type IntegrationStatus = "SUCCESS" | "IN_PROGRESS" | "FAILED" | "PENDING";
export type IntegrationEventType =
  | "COMMIT"
  | "PULL_REQUEST"
  | "CI_CD"
  | "DEPLOY"
  | "EXTERNAL_API";
export type ProjectViewType = "FEED" | "KANBAN" | "CALENDAR" | "GANTT";
export type KnowledgeVisibility = "PERSONAL" | "TEAM" | "PUBLIC";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  statusMessage?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color?: string;
  viewType: ProjectViewType;
  startDate?: string;
  endDate?: string;
  ownerId: string;
}

export interface Task {
  id: string;
  projectId?: string;
  workspaceId?: string;
  title: string;
  content?: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  authorId: string;
  assigneeIds: string[];
  dependencyIds: string[];
  createdAt: string;
  updatedAt: string;
  /** 칸반/간트 순서 (0부터) */
  position?: number;
  /** 작업에 연결된 연동 Badge 요약 (최신 n개) */
  badges?: Array<{ status: IntegrationStatus; eventType: IntegrationEventType }>;
}

export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
  type: "FS" | "SS" | "FF" | "SF";
  lagDays: number;
}

export interface FeedPost {
  id: string;
  workspaceId: string;
  projectId?: string;
  authorId: string;
  type: FeedPostType;
  title?: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  author?: User;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  postId?: string;
  taskId?: string;
  knowledgeArticleId?: string;
  parentId?: string;
  createdAt: string;
  author?: User;
}

export interface KnowledgeArticle {
  id: string;
  workspaceId?: string;
  authorId: string;
  title: string;
  content: string;
  summary?: string;
  visibility: KnowledgeVisibility;
  category?: string;
  tags: string[];
  version: number;
  isPinned: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
}

export interface IntegrationBadge {
  id: string;
  status: IntegrationStatus;
  eventType: IntegrationEventType;
  title: string;
  description?: string;
  targetUrl?: string;
  externalId?: string;
  taskId?: string;
  projectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

/** 지식 베이스 문서 버전 히스토리 */
export interface KnowledgeArticleVersion {
  version: number;
  content: string;
  createdAt: string;
}

/** 통합 검색 결과 */
export interface SearchResult {
  id: string;
  type: "TASK" | "FEED_POST" | "KNOWLEDGE_ARTICLE" | "FILE";
  title: string;
  excerpt?: string;
  link?: string;
  targetUrl?: string; // 파일 결과인 경우 열 링크
}

export interface SearchResponse {
  tasks: SearchResult[];
  feedPosts: SearchResult[];
  knowledgeArticles: SearchResult[];
  files: SearchResult[];
}

/** Socket "user:status" 이벤트 페이로드 — 서버 presence/상태 변경 브로드캐스트와 매칭 */
export interface UserStatusInfo {
  userId: string;
  status: UserStatus;
  statusMessage?: string | null;
}

/** Socket "badge:updated" 이벤트 페이로드 — 연동 Badge 생성/수정/삭제 */
export interface BadgeEventPayload {
  action: "created" | "updated" | "deleted";
  badge?: IntegrationBadge;
  /** 삭제 이벤트일 때의 대상 ID */
  badgeId?: string;
}

// ─────────────────────────────────────────────
// ERP 확장 도메인 타입 (수주/현장 운영)
// ─────────────────────────────────────────────

export type InventoryKind = "RAW" | "PRODUCT";
export type OrderStatus = "CONFIRMED" | "IN_PRODUCTION" | "READY" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "REFUNDED";
export type MarketPlatform = "SMARTSTORE" | "COUPANG" | "OTHER";
export type MarketOrderStatus = "PENDING" | "PREPARING" | "SHIPPING" | "DELIVERED" | "CANCELLED";
export type SmsDirection = "IN" | "OUT";
export type EmailClassification = "UNHANDLED" | "VENDOR" | "TAX_INVOICE" | "OTHER";

export interface OrderItem {
  id?: string;
  name: string;
  spec?: string | null;
  qty: number;
  unit: string;
  unitPrice: number;
  amount?: number;
  note?: string | null;
}

export interface OrderNote {
  id: string;
  workspaceId: string;
  orderNo: string;
  partnerName: string;
  partnerContact?: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
  dueDate?: string | null;
  memo?: string | null;
  taskId?: string | null;
  task?: { id: string; title: string; status: string; progress?: number } | null;
  drawingId?: string | null;
  drawing?: { id: string; fileName: string; svgUrl?: string | null; status: string } | null;
  author?: { id: string; name: string } | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MarketOrder {
  id: string;
  workspaceId: string;
  platform: MarketPlatform;
  orderNo: string;
  buyerName: string;
  buyerPhone?: string | null;
  productName: string;
  qty: number;
  price: number;
  isPrepaid: boolean;
  recipientName: string;
  recipientAddress: string;
  recipientPhone?: string | null;
  status: MarketOrderStatus;
  shippedAt?: string | null;
  trackingNo?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  workspaceId: string;
  sku?: string | null;
  name: string;
  kind: InventoryKind;
  unit: string;
  qty: number;
  safetyQty: number;
  note?: string | null;
  updatedAt: string;
  _count?: { logs: number };
}

export interface PriceItem {
  id: string;
  workspaceId: string;
  category: string;
  bundle?: string | null;
  name: string;
  unitPrice: number;
  note?: string | null;
  updatedAt: string;
}

export interface HandoverMemo {
  id: string;
  workspaceId: string;
  authorId: string;
  author?: { id: string; name: string } | null;
  content: string;
  done: boolean;
  photos: string[];
  orderNoteId?: string | null;
  orderNote?: { id: string; orderNo: string; partnerName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DrawingFile {
  id: string;
  workspaceId: string;
  fileName: string;
  fileUrl: string;
  svgUrl?: string | null;
  mimeType: string;
  size: number;
  status: "READY" | "CONVERTING" | "UNSUPPORTED";
  uploader?: { id: string; name: string } | null;
  createdAt: string;
}

export interface SmsThread {
  id: string;
  workspaceId: string;
  participantName?: string | null;
  participantPhone: string;
  lastMessageAt: string;
  unreadCount: number;
  messages?: Array<{ id: string; content: string; direction: SmsDirection; createdAt: string }>;
}

export interface SmsMessage {
  id: string;
  threadId: string;
  direction: SmsDirection;
  content: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
}

export interface BusinessEmail {
  id: string;
  workspaceId: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  snippet?: string | null;
  classification: EmailClassification;
  isRead: boolean;
  receivedAt: string;
}

export interface KeywordRankSummary {
  keyword: string;
  position: number;
  previousPosition: number | null;
  delta: number | null; // +면 순위 상승
  postUrl?: string | null;
  postTitle?: string | null;
  trackedAt: string;
  historyCount: number;
}

export interface KeywordRecommendation {
  reason: string;
  keyword: string;
  titles: string[];
}

export interface AuditLogEntry {
  id: string;
  workspaceId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  summary: string;
  createdAt: string;
}
