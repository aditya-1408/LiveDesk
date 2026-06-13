import { io } from "socket.io-client";

function defaultSocketUrl() {
  if (typeof window === "undefined") return undefined;
  return undefined;
}

export function createSocket(token, role) {
  return io(import.meta.env.VITE_SOCKET_URL || defaultSocketUrl(), {
    auth: { token, role },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });
}
