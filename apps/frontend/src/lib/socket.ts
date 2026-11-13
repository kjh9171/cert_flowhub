// FlowHub Socket.io 클라이언트 — JWT 인증 +presence 하트비트

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
// 60초마다 서버의 Redis presence TTL을 갱신하는 하트비트
let heartbeat: ReturnType<typeof setInterval> | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || (typeof window !== "undefined" ? window.location.origin : "");
    // 토큰은 브라우저(localStorage)에 저장됨 → 인증 handshake에 전달 (미전송 시 서버가 연결 거부)
    const token =
      typeof window !== "undefined" ? localStorage.getItem("flowhub_token") ?? undefined : undefined;

    socket = io(url, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      autoConnect: true,
      auth: { token }, // 서버 initSocket()의 JWT 미들웨어가 검증
    });

    socket.on("connect", () => {
      console.log("[socket] connected", socket?.id);
      startHeartbeat();
    });

    socket.on("disconnect", (reason) => {
      console.log("[socket] disconnected", reason);
      stopHeartbeat();
    });

    // 재연결 시 최신 토큰을 다시 실어 보낸다 (로그인 전 소켓 생성/토큰 만료 대응)
    socket.io.on("reconnect_attempt", () => {
      const fresh = typeof window !== "undefined" ? localStorage.getItem("flowhub_token") : null;
      if (socket) socket.auth = { token: fresh ?? undefined };
    });

    // 인증 실패 시 즉시 연결 중단 루프 방지 — 로그인 후 getSocket()을 다시 호출하면 재연결
    socket.on("connect_error", (err) => {
      console.warn("[socket] connect_error:", err.message);
    });

    // 이벤트 리스너는 사용처에서 등록 (여기선 존재 확인만)
  }
  return socket;
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeat = setInterval(() => socket?.emit("presence:refresh"), 60_000);
}

function stopHeartbeat() {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;
}

export function disconnectSocket() {
  stopHeartbeat();
  socket?.disconnect();
  socket = null;
}
