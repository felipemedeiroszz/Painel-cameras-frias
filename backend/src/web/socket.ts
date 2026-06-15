import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../shared/env";

let io: Server | null = null;

export function createSocketServer(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    socket.emit("connected", { ok: true });
  });

  return io;
}

export function emitRealtimeEvent(event: string, payload: unknown): void {
  if (!io) return;
  io.emit(event, payload);
}

