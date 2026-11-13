// FlowHub 알림 생성 + 실시간 브로드캐스트 헬퍼

import prisma from "./prisma";
import { io } from "../realtime/socket";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  try {
    const n = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type as any,
        title: params.title,
        body: params.body,
        link: params.link,
      },
    });
    // 해당 사용자의 소켓 룸으로만 전송 (접속 중일 때만 실시간 수신, 오프라인 시 DB 조회로 복구)
    io?.to(`user:${params.userId}`).emit("notification:new", n);
    return n;
  } catch (e) {
    console.error("[notify] failed", e);
    return null;
  }
}

export async function notifyMany(userIds: string[], params: Omit<Parameters<typeof createNotification>[0], "userId">) {
  const unique = Array.from(new Set(userIds));
  return Promise.all(unique.map((uid) => createNotification({ ...params, userId: uid })));
}
