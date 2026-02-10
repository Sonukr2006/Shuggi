# Quick Start Guide - Shuggi-AI WebSocket v2.0

## 🚀 Installation (5 minutes)

### Step 1: Install Server Dependencies
```bash
cd /home/sonu-kr/mydisk/shuggi-ai/server
npm install socket.io redis
```

### Step 2: Install Client Dependencies
```bash
cd /home/sonu-kr/mydisk/shuggi-ai/client
npm install socket.io-client
```

### Step 3: Update App Component
```bash
cd /home/sonu-kr/mydisk/shuggi-ai/client
# Backup original HTTP version
cp src/App.jsx src/App-http.jsx

# Use new WebSocket version
cp src/App-websocket.jsx src/App.jsx
```

## ⚡ Start the Application

### Terminal 1 - Start Server with WebSocket
```bash
cd /home/sonu-kr/mydisk/shuggi-ai/server
npm run dev
```

**Expected Output:**
```
Shuggi server running on http://localhost:5000
WebSocket available at ws://localhost:5000
```

### Terminal 2 - Start Client
```bash
cd /home/sonu-kr/mydisk/shuggi-ai/client
npm run dev
```

**Expected Output:**
```
VITE v7.2.4  ready in 123 ms
  ➜  Local: http://localhost:5173/
```

### Terminal 3 - Start Ollama (Required)
```bash
ollama serve
# Runs on http://localhost:11434
```

### Terminal 4 - Optional: Monitor Server Logs
```bash
# Watch server metrics
curl http://localhost:5000/metrics | jq

# Check health
curl http://localhost:5000/health | jq
```

## 🎯 How It Works

### Flow Diagram:
```
┌─────────────────────────────────────────────────┐
│         USER SPEAKS INTO MICROPHONE             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
        ┌─────────────────────────┐
        │  BROWSER RECORDS AUDIO  │
        │  (MediaRecorder API)    │
        └──────────┬──────────────┘
                   │
                   ▼ (WebSocket)
        ┌─────────────────────────────────┐
        │  SEND AUDIO TO SERVER           │
        │  socket.emit('voice-stream')    │
        └──────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────────┐
        │  SERVER: TRANSCRIBE WITH WHISPER    │
        │  (Audio → Text)                      │
        └──────────┬───────────────────────────┘
                   │
                   ▼ (WebSocket)
        ┌──────────────────────────────────────┐
        │  NOTIFY CLIENT: TRANSCRIPT READY    │
        │  socket.emit('transcript')          │
        └──────────┬───────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────────┐
        │  SERVER: ANALYZE QUERY              │
        │  Is this simple or complex?         │
        └──────────┬───────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    ┌────────────┐       ┌──────────────┐
    │ SIMPLE?    │       │  COMPLEX?    │
    │ USE LOCAL  │       │ USE CLOUD    │
    │ OLLAMA     │       │ OpenAI       │
    │ (Free)     │       │ (API Cost)   │
    └────────┬───┘       └───────┬──────┘
             │                   │
             └────────┬──────────┘
                      │
                      ▼
        ┌──────────────────────────────────────┐
        │  SERVER: GENERATE RESPONSE           │
        │  (Ollama or OpenAI)                  │
        └──────────┬───────────────────────────┘
                   │
                   ▼ (WebSocket)
        ┌──────────────────────────────────────┐
        │  NOTIFY CLIENT: RESPONSE READY       │
        │  socket.emit('response')             │
        │  ├─ reply (text)                     │
        │  ├─ emotion (happy, sad, etc)        │
        │  └─ fromCache (boolean)              │
        └──────────┬───────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────────┐
        │  BROWSER: PLAY RESPONSE              │
        │  ├─ TTS (convert to speech)          │
        │  ├─ Avatar emotion animation        │
        │  └─ Display in UI                    │
        └──────────────────────────────────────┘
```

## 💬 Example Conversation Flow

### User speaks: "Today ka weather Delhi mein kya hai?"

**Query Routing Decision:**
```javascript
// Server analyzes: "today", "weather" → Cloud required
{
  useCloud: true,
  confidence: 0.95,
  factors: ["keyword: today", "keyword: weather"],
  score: 20
}
```

**Processing:**
```
1. Whisper STT: "Today ka weather Delhi mein kya hai?"
2. QueryRouter: Cloud query detected
3. Check Cache: No previous response
4. Call OpenAI: "Delhi's weather today is 28°C, partly cloudy"
5. Detect Emotion: "curious" (because of question mark)
6. Cache Response: For future use
7. Send to Client: reply, emotion, fromCache=false
8. Browser TTS: Speaks with curious tone
```

### User speaks: "Namaste, kaun ho?"

**Query Routing Decision:**
```javascript
// Server analyzes: Simple greeting
{
  useCloud: false,
  confidence: 0.85,
  factors: ["simple: namaste"],
  score: -5
}
```

**Processing:**
```
1. Whisper STT: "Namaste, kaun ho?"
2. QueryRouter: Local query (offline, free)
3. Check Cache: No previous response
4. Call Ollama: "Main Shuggi hoon, aapka AI assistant..."
5. Detect Emotion: "happy"
6. Cache Response: For future use
7. Send to Client: reply, emotion, fromCache=false
8. Browser TTS: Speaks with happy tone
```

### User asks same question again: "Namaste, kaun ho?"

**Second Time (Cache Hit):**
```
1. Whisper STT: "Namaste, kaun ho?"
2. QueryRouter: Local query
3. Check Cache: ✅ FOUND!
4. Return Cached: No API call needed
5. Send to Client: reply, emotion, fromCache=true  ← Different!
6. Browser TTS: Speaks response
7. UI shows: "💾 Response from cache"
```

## 🎮 UI Features

### Status Indicators:
- 🔴 **Disconnected**: Not connected to server
- 🟢 **Idle**: Ready to listen
- 🟡 **Listening**: Recording audio
- 🟡 **Processing**: Thinking/generating response
- 🟡 **Analyzing**: Detecting emotion
- 🔵 **Connected**: Connection info with emotion tag

### Buttons:
- **🎤 Start Voice**: Record and send audio
- **⏹️ Stop & Send**: Stop recording and process
- **💬 Speak Frontend**: Demo text-to-speech
- **🔇 Stop Voice**: Stop audio playback

### Toggles:
- **👀 Head look-at**: Avatar looks at camera
- **🔊 Browser voice**: Play TTS responses

### Dashboard:
- **📊 Show Metrics**: View server statistics
  - Cache Hit Rate: % of responses from cache
  - Active Connections: Users connected
  - Messages Processed: Total processed
  - Cloud/Local Query split

### Response Card:
- **You**: What user said (transcript)
- **Shuggi**: Avatar's response
- **Emotion**: Current emotion (happy, sad, etc)
- **💾 From cache**: Indicator if cached

## 🔍 Monitoring in Real-time

### Browser Console (`F12`):
```javascript
// Check connection
socket.connected // true or false

// Listen for events
socket.on('status', (data) => console.log('Status:', data));
socket.on('response', (data) => console.log('Response:', data));
socket.on('error-response', (error) => console.log('Error:', error));

// Send test message
socket.emit('text-message', 'Hello, how are you?');

// Request metrics
socket.emit('request-stats');
socket.on('stats', (stats) => console.log('Server Stats:', stats));
```

### Server Metrics Endpoint:
```bash
# In another terminal
while true; do
  clear
  curl -s http://localhost:5000/metrics | jq '.'
  sleep 2
done
```

### Live Log Output:
```
[WS] Client connected: client_1707576234_abc123def456 (Total: 1)
[WS] Voice stream received from client_1707576234_abc123def456
[WS] Status: transcribing
[WS] Status: processing
[WS] Status: analyzing
[WS] Cache hit for: "namaste kaun ho"
[WS] Response: "Main Shuggi hoon..."
[WS] Status: idle
```

## 💰 Cost Analysis

### Scenario: 1000 users, 10 queries/day each = 10,000 queries/day

#### Query Distribution:
- 60% Local (Ollama): **FREE** ✅
  - 6,000 queries × $0 = $0

- 40% Cloud (OpenAI) - First time:
  - 4,000 queries × $0.002 = $8

- 40% Cloud - Repeat (From Cache):
  - 4,000 queries × $0 (cached) = $0

**Daily Cost: $8**
**Monthly Cost: $240** (vs $6,000 for pure cloud)
**Savings: 96%** 🎉

## ⚙️ Configuration Tips

### For High Latency:
```javascript
// In useVoiceChat hook, increase timeout:
reconnectionDelay: 2000,        // 2 seconds
reconnectionDelayMax: 10000,    // 10 seconds
reconnectionAttempts: 15,       // More attempts
```

### For Low Bandwidth:
```javascript
// In socketHandler.js, reduce buffer:
maxHttpBufferSize: 5 * 1024 * 1024,  // 5MB instead of 12MB
pingInterval: 60000,                  // Less frequent pings
```

### For More Cloud Processing:
```javascript
// In queryRouter.js, increase cloud score:
// Reduce 'score > 5' threshold to 'score > 2'
```

## 🚀 Production Deployment

See `WEBSOCKET_IMPLEMENTATION.md` for full deployment guide covering:
- PM2 process management
- Nginx reverse proxy
- SSL/TLS setup
- Docker containerization
- Database integration

## 📞 Support

If you have issues:

1. **Check Connection:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check Logs:**
   ```bash
   # Terminal 1 (Server logs)
   # Terminal 2 (Browser console F12)
   ```

3. **Reset Connection:**
   ```javascript
   // In browser console
   socket.disconnect();
   socket.connect();
   ```

4. **Test Ollama:**
   ```bash
   curl http://localhost:11434/api/generate -X POST \
     -H "Content-Type: application/json" \
     -d '{"model": "llama3.1", "prompt": "hello"}'
   ```

## 🎯 Next Steps

1. **Customize Emotions:** Edit `emotionTtsStyle` in App.jsx
2. **Change Avatar:** Replace VRM model in public/
3. **Add Features:** See `WEBSOCKET_IMPLEMENTATION.md`
4. **Deploy:** Follow production guide for AWS/Google Cloud/Digital Ocean

---

**Happy building! Your Shuggi-AI is ready for production use! 🎉**
