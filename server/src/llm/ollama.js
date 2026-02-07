import { config } from "../config.js";

function buildPrompt(message) {
  return [
    "You are Shuggi, a warm, natural, human-like female AI assistant.",
    "Keep responses concise (1 to 4 short sentences), empathetic, and practical.",
    "Avoid markdown, avoid bullet points, and speak as if in a live voice conversation.",
    "",
    `User: ${message}`,
    "Shuggi:",
  ].join("\n");
}

export async function generateAssistantReply(message) {
  if (!message || !message.trim()) {
    return "I did not catch that clearly. Please try again.";
  }

  const response = await fetch(config.ollamaUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ollamaModel,
      prompt: buildPrompt(message.trim()),
      stream: false,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Ollama request failed: ${response.status} ${detail}`);
  }

  const data = await response.json();
  const reply = data?.response?.trim();
  return reply || "I am here. Could you repeat that one more time?";
}
