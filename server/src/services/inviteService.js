import crypto from "node:crypto";
import { v4 as uuidv4 } from "uuid";

export function generateInviteToken() {
  return `${uuidv4()}-${crypto.randomBytes(16).toString("hex")}`;
}
