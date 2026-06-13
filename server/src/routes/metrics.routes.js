import express from "express";
import { getMetricsRegistry, getOperationalMetrics } from "../services/metricsService.js";

export const metricsRouter = express.Router();

function sendOperationalMetrics(_req, res) {
  res.json(getOperationalMetrics());
}

metricsRouter.get("/api/metrics", sendOperationalMetrics);
metricsRouter.get("/api/metrics.", sendOperationalMetrics);

metricsRouter.get("/metrics", async (_req, res) => {
  const registry = getMetricsRegistry();
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});
