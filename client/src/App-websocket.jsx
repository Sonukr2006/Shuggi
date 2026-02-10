import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Scene from "./Scene";
import useVoiceChat from "./hooks/useVoiceChat";

const MAX_HISTORY_ITEMS = 8;

const emotionTtsStyle = {
  happy: { rate: 1.02, pitch: 1.18 },
  excited: { rate: 1.08, pitch: 1.2 },
  calm: { rate: 0.95, pitch: 1.05 },
  concerned: { rate: 0.94, pitch: 1.0 },
  sad: { rate: 0.92, pitch: 0.95 },
  angry: { rate: 1.0, pitch: 0.88 },
  curious: { rate: 1.0, pitch: 1.12 },
  neutral: { rate: 1.0, pitch: 1.08 },
};

function detectSpeechLanguage(text) {
  if (/[\u0900-\u097F]/.test(text)) return "hi-IN";
  return "en-US";
}

function pickRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return preferred.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export default function App() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [headLookAtEnabled, setHeadLookAtEnabled] = useState(true);
  const [voicePlaybackEnabled, setVoicePlaybackEnabled] = useState(true);
  const [history, setHistory] = useState([]);
  const [demoText, setDemoText] = useState("Namaste! Main Shuggi hoon. Kaise help karun?");
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);

  // WebSocket hook
  const {
    isConnected,
    status: wsProcessingStatus,
    error: wsError,
    currentEmotion,
    metrics,
    sendVoiceAudio,
    sendTextMessage,
    requestMetrics,
  } = useVoiceChat((response) => {
    if (response.type === "transcript") {
      setCurrentTranscript(response.content);
    } else if (response.type === "response") {
      const turnId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `turn-${Date.now()}`;
      const conversationTurn = {
        id: turnId,
        timestamp: Date.now(),
        transcript: currentTranscript,
        reply: response.content,
        emotion: response.emotion,
        fromCache: response.fromCache,
      };

      setHistory((current) =>
        [conversationTurn, ...current].slice(0, MAX_HISTORY_ITEMS)
      );
      speakReply(response.content, response.emotion);
      setCurrentTranscript("");
    }
  });

  const latest = history[0] || null;

  // Combined status for UI
  const displayStatus = !isConnected ? "disconnected" : wsProcessingStatus;

  const statusLabel = useMemo(() => {
    if (!isConnected) return "Disconnected";
    switch (wsProcessingStatus) {
      case "transcribing":
        return "Listening...";
      case "processing":
      case "analyzing":
        return "Thinking...";
      case "speaking":
        return "Speaking...";
      case "idle":
        return "Ready";
      default:
        return "Processing...";
    }
  }, [isConnected, wsProcessingStatus]);

  const stopStreamTracks = useCallback(() => {
    if (!streamRef.current) return;
    for (const track of streamRef.current.getTracks()) {
      track.stop();
    }
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopStreamTracks();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stopStreamTracks]);

  const speakReply = useCallback(
    (text, emotion) => {
      if (!voicePlaybackEnabled || !("speechSynthesis" in window) || !text) {
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const style = emotionTtsStyle[emotion] || emotionTtsStyle.neutral;
      utterance.rate = style.rate;
      utterance.pitch = style.pitch;
      utterance.lang = detectSpeechLanguage(text);
      window.speechSynthesis.speak(utterance);
    },
    [voicePlaybackEnabled]
  );

  const playFrontendDemo = useCallback(() => {
    const message = demoText.trim();
    if (!message) {
      return;
    }

    const turnId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `turn-${Date.now()}`;
    const conversationTurn = {
      id: turnId,
      timestamp: Date.now(),
      transcript: "(Frontend demo mode)",
      reply: message,
      emotion: "happy",
    };

    setHistory((current) =>
      [conversationTurn, ...current].slice(0, MAX_HISTORY_ITEMS)
    );
    speakReply(message, "happy");
  }, [demoText, speakReply]);

  const stopSpeechPlayback = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const handleRecordingStop = useCallback(async () => {
    try {
      setIsRecording(false);
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      if (!audioBlob.size) {
        throw new Error("No audio was captured. Please try again.");
      }

      // Send via WebSocket
      await sendVoiceAudio(audioBlob);
    } catch (requestError) {
      console.error(requestError);
    } finally {
      stopStreamTracks();
    }
  }, [sendVoiceAudio, stopStreamTracks]);

  const startRecording = useCallback(async () => {
    try {
      if (isRecording || !isConnected) {
        return;
      }

      if (typeof MediaRecorder === "undefined") {
        throw new Error("MediaRecorder is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = handleRecordingStop;

      mediaRecorderRef.current = recorder;
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      recorder.start();
      setIsRecording(true);
    } catch (recordError) {
      console.error(recordError);
      stopStreamTracks();
    }
  }, [isRecording, isConnected, handleRecordingStop, stopStreamTracks]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
      return;
    }
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }, []);

  return (
    <div className="appRoot">
      <Scene
        headLookAtEnabled={headLookAtEnabled}
        speaking={wsProcessingStatus === "analyzing"}
      />

      <section className="controlPanel">
        <h1>Shuggi AI</h1>
        <p className="tagline">Real-time local avatar assistant (WebSocket v2.0)</p>

        <div className="statusRow">
          <span className={`statusDot status-${displayStatus}`} />
          <span>
            {statusLabel}
            {isConnected && (
              <span style={{ marginLeft: "8px", fontSize: "0.85em", opacity: 0.7 }}>
                ({currentEmotion})
              </span>
            )}
          </span>
        </div>

        {wsError && (
          <div style={{ color: "#d32f2f", fontSize: "0.9em", marginBottom: "8px", padding: "4px" }}>
            ⚠️ {wsError.error}: {wsError.message}
          </div>
        )}

        <div className="buttonRow">
          {!isRecording ? (
            <button
              className="primaryButton"
              onClick={startRecording}
              disabled={!isConnected}
            >
              {isConnected ? "🎤 Start Voice" : "Connecting..."}
            </button>
          ) : (
            <button className="primaryButton stopButton" onClick={stopRecording}>
              ⏹️ Stop & Send
            </button>
          )}
        </div>

        <textarea
          className="demoInput"
          rows={3}
          value={demoText}
          onChange={(event) => setDemoText(event.target.value)}
          placeholder="Type text to make Shuggi speak from frontend"
        />

        <div className="buttonGrid">
          <button
            className="primaryButton"
            type="button"
            onClick={playFrontendDemo}
            disabled={!isConnected}
          >
            💬 Speak Frontend
          </button>
          <button className="secondaryButton" type="button" onClick={stopSpeechPlayback}>
            🔇 Stop Voice
          </button>
        </div>

        <label className="switchRow">
          <input
            type="checkbox"
            checked={headLookAtEnabled}
            onChange={(event) => setHeadLookAtEnabled(event.target.checked)}
          />
          👀 Head look-at
        </label>

        <label className="switchRow">
          <input
            type="checkbox"
            checked={voicePlaybackEnabled}
            onChange={(event) => setVoicePlaybackEnabled(event.target.checked)}
          />
          🔊 Browser voice playback
        </label>

        <button
          className="secondaryButton"
          onClick={() => {
            setShowMetrics(!showMetrics);
            if (!showMetrics) requestMetrics();
          }}
          style={{ width: "100%", marginTop: "8px" }}
        >
          {showMetrics ? "📊 Hide Metrics" : "📊 Show Metrics"}
        </button>

        {showMetrics && metrics && (
          <div
            style={{
              fontSize: "0.8em",
              marginTop: "8px",
              padding: "8px",
              backgroundColor: "#f5f5f5",
              borderRadius: "4px",
              fontFamily: "monospace",
            }}
          >
            <p><strong>Cache Hit Rate:</strong> {metrics.responseCache?.cacheHitRate}%</p>
            <p><strong>Active Connections:</strong> {metrics.serverMetrics?.activeConnections}</p>
            <p><strong>Messages Processed:</strong> {metrics.serverMetrics?.messagesProcessed}</p>
            <p><strong>Cloud Queries:</strong> {metrics.queryRouter?.cloudQueries}</p>
            <p><strong>Local Queries:</strong> {metrics.queryRouter?.localQueries}</p>
          </div>
        )}

        <div className="latestCard">
          <h2>Latest Turn</h2>
          <p>
            <strong>You:</strong> {latest?.transcript || currentTranscript || "Waiting..."}
          </p>
          <p>
            <strong>Shuggi:</strong> {latest?.reply || "No reply yet"}
          </p>
          <p>
            <strong>Emotion:</strong> {latest?.emotion || "neutral"}
          </p>
          {latest?.fromCache && (
            <p style={{ fontSize: "0.85em", color: "#2196f3", marginTop: "4px" }}>
              💾 Response from cache
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
