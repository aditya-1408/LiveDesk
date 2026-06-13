import { Server } from "socket.io";
import { config, isAllowedOrigin } from "../config.js";
import { registerChat } from "./chat.js";
import { registerSignaling } from "./signaling.js";

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    registerSignaling(io, socket);
    registerChat(socket);
  });

  return io;
}
