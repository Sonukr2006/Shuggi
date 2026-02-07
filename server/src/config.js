import dotenv from "dotenv";

dotenv.config({ quiet: true });

function parseNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: parseNumber(process.env.PORT, 5000),
  ollamaUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3.1",
  pythonBin: process.env.PYTHON_BIN || "python3",
  whisperModel: process.env.WHISPER_MODEL || "base",
  whisperComputeType: process.env.WHISPER_COMPUTE_TYPE || "int8",
  whisperLanguage: process.env.WHISPER_LANGUAGE || "",
  maxAudioMb: parseNumber(process.env.MAX_AUDIO_MB, 12),
};
