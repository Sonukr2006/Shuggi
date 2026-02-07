# Shuggi AI

Shuggi is a real-time, human-like AI avatar assistant that runs locally:

- Voice in -> local STT (Whisper)
- Local LLM reasoning (Ollama)
- Emotion tagging
- Voice out (browser TTS now, local TTS engine next)
- 3D VRM avatar with blink, idle breathing, optional head look-at

This repository is structured as a production-ready foundation, not a single-page demo.

## Current Status

- VRM avatar load: stable
- Blink + idle breathing: stable
- Head look-at: optional and toggleable
- Voice input to backend: implemented
- Whisper STT integration (Python): implemented
- Ollama reply generation: implemented
- Emotion tagging: implemented
- Local TTS engine (Piper/Coqui): planned
- Lip-sync: planned

## Architecture

```
User Voice
  -> Browser recording (MediaRecorder)
  -> /api/voice-chat (Express)
  -> Whisper (faster-whisper, local Python)
  -> Ollama (llama3.1 by default)
  -> Emotion detector
  -> Frontend playback + avatar state
```

## Project Structure

```
shuggi-ai/
├─ client/
│  ├─ public/
│  │  └─ shuggi_final.vrm
│  └─ src/
│     ├─ App.jsx
│     ├─ Scene.jsx
│     ├─ api/voiceChat.js
│     └─ components/
│        ├─ ShuggiModel.jsx
│        ├─ Blink.jsx
│        ├─ Idle.jsx
│        └─ HeadLookAt.jsx
└─ server/
   ├─ index.js
   └─ src/
      ├─ index.js
      ├─ config.js
      ├─ routes/voiceChat.js
      ├─ llm/ollama.js
      ├─ voice/
      │  ├─ stt.js
      │  └─ stt.py
      └─ utils/emotion.js
```

## Prerequisites

- Node.js 18+
- Python 3.10+ (for Whisper)
- Ollama installed and running locally
- A pulled local model in Ollama (default configured: `llama3.1`)

## Setup

### 1) Ollama

```bash
ollama pull llama3.1
ollama serve
```

### 2) Backend

```bash
cd server
npm install
node index.js
```

Optional env file: `server/.env`

```bash
PORT=5000
OLLAMA_URL=http://127.0.0.1:11434/api/generate
OLLAMA_MODEL=llama3.1
PYTHON_BIN=python3
WHISPER_MODEL=base
WHISPER_COMPUTE_TYPE=int8
WHISPER_LANGUAGE=
MAX_AUDIO_MB=12
```

### 3) Python STT deps

Create and activate your backend venv, then install:

```bash
pip install faster-whisper
```

`faster-whisper` also requires FFmpeg on your system path.

### 4) Frontend

```bash
cd client
npm install
npm run dev
```

Optional frontend env file: `client/.env`

```bash
VITE_API_BASE_URL=http://localhost:5000
```

## API Endpoints

- `GET /health`
- `POST /api/chat`
  - body: `{ "message": "..." }`
- `POST /api/voice-chat`
  - raw audio bytes (`audio/webm` recommended)
  - response: `{ transcript, reply, emotion, language }`
- `POST /chat` (legacy alias of `/api/chat`)

## Design Principles

- VRM-native pipeline (`.vrm` direct load, no GLB conversion)
- Separation of concerns (Avatar logic stays in frontend components, AI logic in backend)
- Local-first privacy and cost control
- Production-friendly modular backend structure

## Next Priority

1. Replace browser TTS with local Piper/Coqui service.
2. Add streaming responses and interruption handling.
3. Add emotion-driven facial expressions and lip-sync.
