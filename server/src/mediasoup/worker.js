import mediasoup from "mediasoup";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

let worker;

export async function createMediasoupWorker() {
  worker = await mediasoup.createWorker({
    rtcMinPort: config.rtcMinPort,
    rtcMaxPort: config.rtcMaxPort,
    logLevel: "warn"
  });

  worker.on("died", () => {
    logger.error("mediasoup worker died; exiting process");
    setTimeout(() => process.exit(1), 1000);
  });

  logger.info(`mediasoup worker ready on RTC ports ${config.rtcMinPort}-${config.rtcMaxPort}`);
  return worker;
}

export function getWorker() {
  if (!worker) throw new Error("mediasoup worker has not been initialized");
  return worker;
}
