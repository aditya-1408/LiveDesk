import client from "prom-client";
import { db } from "../db/database.js";

client.collectDefaultMetrics();

let socketErrorCount = 0;
let mediasoupProducerCount = 0;
const startedAt = Date.now();

export const socketErrorsTotal = new client.Counter({
  name: "socket_errors_total",
  help: "Total socket errors emitted to clients"
});

export const mediasoupProducersTotal = new client.Counter({
  name: "mediasoup_producers_total",
  help: "Total mediasoup producers created"
});

export function recordSocketError() {
  socketErrorCount += 1;
  socketErrorsTotal.inc();
}

export function recordMediasoupProducer() {
  mediasoupProducerCount += 1;
  mediasoupProducersTotal.inc();
}

export const activeSessionsGauge = new client.Gauge({
  name: "active_sessions",
  help: "Sessions currently created or active",
  collect() {
    const row = db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE status IN ('created', 'active')").get();
    this.set(row.count);
  }
});

export const connectedParticipantsGauge = new client.Gauge({
  name: "connected_participants",
  help: "Participants without a recorded left_at timestamp",
  collect() {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM participants p
         JOIN sessions s ON s.id = p.session_id
         WHERE p.left_at IS NULL AND s.status IN ('created', 'active')`
      )
      .get();
    this.set(row.count);
  }
});

export function getMetricsRegistry() {
  return client.register;
}

function formatUptime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function getOperationalMetrics() {
  const activeSessions = db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE status IN ('created', 'active')").get().count;
  const connectedParticipants = db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM participants p
       JOIN sessions s ON s.id = p.session_id
       WHERE p.left_at IS NULL AND s.status IN ('created', 'active')`
    )
    .get().count;
  const totalSessions = db.prepare("SELECT COUNT(*) AS count FROM sessions").get().count;
  const totalSessionsToday = db
    .prepare("SELECT COUNT(*) AS count FROM sessions WHERE date(created_at) = date('now', 'localtime')")
    .get().count;
  const endedSessions = db.prepare("SELECT COUNT(*) AS count FROM sessions WHERE status = 'ended'").get().count;
  const recordingReady = db.prepare("SELECT COUNT(*) AS count FROM recordings WHERE status = 'ready'").get().count;
  const totalMessages = db.prepare("SELECT COUNT(*) AS count FROM chat_messages").get().count;
  const failedConnections = socketErrorCount;
  const errorRate = totalSessions + failedConnections === 0 ? 0 : Number(((failedConnections / (totalSessions + failedConnections)) * 100).toFixed(2));
  const uptimeSeconds = Math.floor((Date.now() - startedAt) / 1000);

  return {
    status: "ok",
    activeSessions,
    connectedParticipants,
    totalSessions,
    totalSessionsToday,
    endedSessions,
    totalMessages,
    recordingsReady: recordingReady,
    failedConnections,
    socketErrors: socketErrorCount,
    mediasoupProducers: mediasoupProducerCount,
    errorRate,
    errorRatePercent: `${errorRate}%`,
    serverUptime: formatUptime(uptimeSeconds),
    uptimeSeconds,
    timestamp: new Date().toISOString()
  };
}
