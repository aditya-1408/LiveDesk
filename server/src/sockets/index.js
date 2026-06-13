import { Server } from "socket.io";
import { config } from "../config.js";
import { registerChat } from "./chat.js";
import { registerSignaling } from "./signaling.js";

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.clientOrigin,
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    registerSignaling(io, socket);
    registerChat(socket);
  });

  return io;
}
