import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  databasePath: process.env.DATABASE_PATH || "./support.db",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  recordingDir: process.env.RECORDING_DIR || "./recordings",
  announcedIp: process.env.ANNOUNCED_IP || "127.0.0.1",
  rtcMinPort: Number(process.env.RTC_MIN_PORT || 40000),
  rtcMaxPort: Number(process.env.RTC_MAX_PORT || 40100),
  reconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS || 30000)
};

export const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000
    }
  }
];

export const webRtcTransportOptions = {
  listenIps: [
    {
      ip: "0.0.0.0",
      announcedIp: config.announcedIp
    }
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
  initialAvailableOutgoingBitrate: 1_000_000
};
