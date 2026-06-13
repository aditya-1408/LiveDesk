import { io } from "socket.io-client";

export function createSocket(token, role) {
  return io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
    auth: { token, role },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });
}
