// FlowHub Socket.io 게이트웨이 (싱글톤)

import http from "http";
import { Server, Socket } from "socket.io";

export let io: Server | null = null;

export function initSocket(server: http.Server): Server {
  io = new Server(server, {
    path: "/socket.io",
    cors: {
      origin: (process.env.CORS_ORIGIN || "*").split(","),
      credentials: true,
    },
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("user:status", (payload) => {
      io?.emit("user:status", payload);
    });

    socket.on("task:updated", (payload) => {
      socket.broadcast.emit("task:updated", payload);
    });

    socket.on("badge:updated", (payload) => {
      io?.emit("badge:updated", payload);
    });

    socket.on("notification:new", (payload) => {
      io?.emit("notification:new", payload);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIO(): Server | null {
  return io;
}

// Note: `io` is a live binding updated by initSocket
