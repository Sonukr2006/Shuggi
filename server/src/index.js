import cors from "cors";
import express from "express";
import { createServer } from "http";
import { config } from "./config.js";
import { voiceChatRouter } from "./routes/voiceChat.js";
import { initializeWebSocketServer, getServerMetrics, resetMetrics } from "./websocket.js";

export const app = express();
const httpServer = createServer(app);

// Initialize WebSocket server
const io = initializeWebSocketServer(httpServer);

app.use(
  cors({
    origin: true,
    credentials: false,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(voiceChatRouter);

app.get("/health", (_, res) => {
  res.json({
    ok: true,
    model: config.ollamaModel,
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint
app.get("/metrics", (_, res) => {
  res.json(getServerMetrics());
});

// Reset metrics endpoint (POST for safety)
app.post("/metrics/reset", (_, res) => {
  resetMetrics();
  res.json({ message: "Metrics reset successfully" });
});

app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") {
    res.status(413).json({
      error: "payload_too_large",
      message: `Audio exceeds max size (${config.maxAudioMb} MB).`,
    });
    return;
  }

  console.error("Unexpected server error:", error);
  res.status(500).json({
    error: "internal_server_error",
    message: "Unexpected backend error.",
  });
});

export function startServer() {
  httpServer.listen(config.port, () => {
    console.log(`Shuggi server running on http://localhost:${config.port}`);
    console.log(`WebSocket available at ws://localhost:${config.port}`);
  });
}
