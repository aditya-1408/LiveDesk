import { verifyToken } from "./jwt.js";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing authorization token" });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAgent(req, res, next) {
  requireAuth(req, res, () => {
    if (!["agent", "admin"].includes(req.user.role)) return res.status(403).json({ error: "Agent access required" });
    next();
  });
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    next();
  });
}
