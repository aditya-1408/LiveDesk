import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  clientOrigins: (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret: process.env.JWT_SECRET || "dev-only-change-me",
  adminSignupCode: process.env.ADMIN_SIGNUP_CODE || "admin123",
  databasePath: process.env.DATABASE_PATH || "./support.db",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  recordingDir: process.env.RECORDING_DIR || "./recordings",
  announcedIp: process.env.ANNOUNCED_IP || "127.0.0.1",
  rtcMinPort: Number(process.env.RTC_MIN_PORT || 40000),
  rtcMaxPort: Number(process.env.RTC_MAX_PORT || 40100),
  reconnectGraceMs: Number(process.env.RECONNECT_GRACE_MS || 30000),
  customerReturnWindowMs: Number(process.env.CUSTOMER_RETURN_WINDOW_MS || 300000)
};

export function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (config.clientOrigins.includes("*") || config.clientOrigins.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.startsWith("192.168.") ||
      url.hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(url.hostname)
    );
  } catch {
    return false;
  }
}

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
