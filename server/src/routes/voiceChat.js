import express, { Router } from "express";
import { generateAssistantReply } from "../llm/ollama.js";
import { detectEmotion } from "../utils/emotion.js";
import { transcribeAudioBuffer } from "../voice/stt.js";
import { config } from "../config.js";

const audioRawParser = express.raw({
  type: [
    "audio/webm",
    "audio/webm;codecs=opus",
    "audio/wav",
    "audio/wave",
    "audio/mpeg",
    "audio/mp4",
    "application/octet-stream",
  ],
  limit: `${config.maxAudioMb}mb`,
});

export const voiceChatRouter = Router();

async function buildChatResponse(message) {
  const reply = await generateAssistantReply(message);
  const emotion = detectEmotion(reply);
  return { reply, emotion };
}

async function handleTextChat(req, res) {
  try {
    const message = req.body?.message || "";
    const { reply, emotion } = await buildChatResponse(message);
    res.json({ reply, emotion });
  } catch (error) {
    console.error("Text chat failed:", error);
    res.status(500).json({
      error: "chat_failed",
      message: "Unable to generate a reply right now.",
    });
  }
}

voiceChatRouter.post("/api/chat", handleTextChat);
voiceChatRouter.post("/chat", handleTextChat);

voiceChatRouter.post("/api/voice-chat", audioRawParser, async (req, res) => {
  try {
    const contentType = req.get("content-type") || "";
    const body = req.body;

    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({
        error: "audio_missing",
        message: "No audio bytes received.",
      });
      return;
    }

    const transcription = await transcribeAudioBuffer(body, contentType);
    const transcript = transcription.text;

    if (!transcript) {
      res.status(422).json({
        transcript: "",
        reply: "I heard audio but could not detect clear speech.",
        emotion: "neutral",
      });
      return;
    }

    const { reply, emotion } = await buildChatResponse(transcript);
    res.json({
      transcript,
      reply,
      emotion,
      language: transcription.language,
    });
  } catch (error) {
    console.error("Voice chat failed:", error);
    res.status(500).json({
      error: "voice_chat_failed",
      message: error.message || "Voice pipeline failed.",
    });
  }
});
