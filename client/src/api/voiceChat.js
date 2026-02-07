const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function parseApiResponse(response) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function sendVoiceAudio(audioBlob) {
  const response = await fetch(`${API_BASE_URL}/api/voice-chat`, {
    method: "POST",
    headers: {
      "Content-Type": audioBlob.type || "application/octet-stream",
    },
    body: audioBlob,
  });

  return parseApiResponse(response);
}

export async function sendTextMessage(message) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  return parseApiResponse(response);
}
