import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sttScriptPath = path.join(__dirname, "stt.py");

function extensionForMime(mimeType) {
  if (!mimeType) return "webm";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("mp4")) return "m4a";
  return "webm";
}

function runWhisper(tempPath) {
  return new Promise((resolve, reject) => {
    const args = [
      sttScriptPath,
      "--file",
      tempPath,
      "--model",
      config.whisperModel,
      "--compute-type",
      config.whisperComputeType,
    ];

    if (config.whisperLanguage) {
      args.push("--language", config.whisperLanguage);
    }

    const child = spawn(config.pythonBin, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Whisper exited with code ${code}`));
        return;
      }

      try {
        const data = JSON.parse(stdout);
        resolve({
          text: data?.text?.trim() || "",
          language: data?.language || "unknown",
        });
      } catch (error) {
        reject(
          new Error(`Unable to parse Whisper output: ${error.message || String(error)}`)
        );
      }
    });
  });
}

export async function transcribeAudioBuffer(audioBuffer, mimeType) {
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error("Audio payload is empty.");
  }

  const maxBytes = config.maxAudioMb * 1024 * 1024;
  if (audioBuffer.length > maxBytes) {
    throw new Error(`Audio exceeds max size (${config.maxAudioMb} MB).`);
  }

  const extension = extensionForMime(mimeType);
  const tempPath = path.join(os.tmpdir(), `shuggi-${randomUUID()}.${extension}`);

  await fs.writeFile(tempPath, audioBuffer);

  try {
    return await runWhisper(tempPath);
  } finally {
    await fs.unlink(tempPath).catch(() => {});
  }
}
