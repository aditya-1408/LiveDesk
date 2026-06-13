import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === "https" ? basicSsl() : null].filter(Boolean),
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/health": "http://localhost:4000",
      "/metrics": "http://localhost:4000",
      "/socket.io": {
        target: "http://localhost:4000",
        ws: true
      }
    }
  }
}));
