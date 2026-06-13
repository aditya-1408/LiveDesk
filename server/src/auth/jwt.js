import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function signAgent(agent) {
  return jwt.sign({ role: "agent", agentId: agent.id, username: agent.username }, config.jwtSecret, {
    expiresIn: "8h"
  });
}

export function signCustomer(sessionId) {
  return jwt.sign({ role: "customer", sessionId }, config.jwtSecret, {
    expiresIn: "4h"
  });
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}
