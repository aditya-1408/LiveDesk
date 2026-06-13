import http from "node:http";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { initDatabase } from "./db/database.js";
import { createMediasoupWorker } from "./mediasoup/worker.js";
import { authRouter } from "./routes/auth.routes.js";
import { sessionRouter } from "./routes/session.routes.js";
import { recordingRouter } from "./routes/recording.routes.js";
import { adminRouter } from "./routes/admin.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { metricsRouter } from "./routes/metrics.routes.js";
import { createSocketServer } from "./sockets/index.js";
import { logger } from "./utils/logger.js";

async function bootstrap() {
  initDatabase();
  await createMediasoupWorker();

  const app = express();
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRouter);
  app.use("/api", sessionRouter);
  app.use("/api", recordingRouter);
  app.use("/api", adminRouter);
  app.use("/api", uploadRouter);
  app.use(metricsRouter);

  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer);
  app.set("io", io);

  httpServer.listen(config.port, () => {
    logger.info(`API and Socket.IO listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((error) => {
  logger.error(error);
  process.exit(1);
});
