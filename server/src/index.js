import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { voiceChatRouter } from "./routes/voiceChat.js";

export const app = express();

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
  app.listen(config.port, () => {
    console.log(`Shuggi server running on http://localhost:${config.port}`);
  });
}
