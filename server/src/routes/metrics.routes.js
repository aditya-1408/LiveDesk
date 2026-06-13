import express from "express";
import { getMetricsRegistry } from "../services/metricsService.js";

export const metricsRouter = express.Router();

metricsRouter.get("/metrics", async (_req, res) => {
  const registry = getMetricsRegistry();
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
});
