import { verifyToken } from "../auth/jwt.js";

export function authenticateSocket(socket) {
  const token = socket.handshake.auth?.token;
  if (!token) throw new Error("Missing socket token");
  return verifyToken(token);
}
