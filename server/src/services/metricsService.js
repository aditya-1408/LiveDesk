import client from "prom-client";
import { db } from "../db/database.js";

client.collectDefaultMetrics();

export const socketErrorsTotal = new client.Counter({
  name: "socket_errors_total",
  help: "Total socket errors emitted to clients"
});

export const mediasoupProducersTotal = new client.Counter({
  name: "mediasoup_producers_total",
  help: "Total mediasoup producers created"
});

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
    const row = db.prepare("SELECT COUNT(*) AS count FROM participants WHERE left_at IS NULL").get();
    this.set(row.count);
  }
});

export function getMetricsRegistry() {
  return client.register;
}
