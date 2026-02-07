import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Scene from "./Scene";
import { sendVoiceAudio } from "./api/voiceChat";

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

function pickRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return preferred.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export default function App() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [headLookAtEnabled, setHeadLookAtEnabled] = useState(true);
  const [voicePlaybackEnabled, setVoicePlaybackEnabled] = useState(true);
  const [history, setHistory] = useState([]);

  const latest = history[0] || null;

  const statusLabel = useMemo(() => {
    switch (status) {
      case "listening":
        return "Listening...";
      case "thinking":
        return "Thinking...";
      case "speaking":
        return "Speaking...";
      default:
        return "Ready";
    }
  }, [status]);

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

  const speakReply = useCallback((text, emotion) => {
    if (!voicePlaybackEnabled || !("speechSynthesis" in window) || !text) {
      setStatus("idle");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const style = emotionTtsStyle[emotion] || emotionTtsStyle.neutral;
    utterance.rate = style.rate;
    utterance.pitch = style.pitch;
    utterance.lang = "en-US";
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    window.speechSynthesis.speak(utterance);
  }, [voicePlaybackEnabled]);

  const handleRecordingStop = useCallback(async () => {
    try {
      setIsRecording(false);
      setStatus("thinking");
      const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];

      if (!audioBlob.size) {
        throw new Error("No audio was captured. Please try again.");
      }

      const payload = await sendVoiceAudio(audioBlob);
      const turnId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `turn-${Date.now()}`;
      const conversationTurn = {
        id: turnId,
        timestamp: Date.now(),
        transcript: payload.transcript || "",
        reply: payload.reply || "",
        emotion: payload.emotion || "neutral",
      };

      setHistory((current) => [conversationTurn, ...current].slice(0, MAX_HISTORY_ITEMS));
      speakReply(conversationTurn.reply, conversationTurn.emotion);
      if (!voicePlaybackEnabled) {
        setStatus("idle");
      }
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message || "Voice chat failed.");
      setStatus("idle");
    } finally {
      stopStreamTracks();
    }
  }, [speakReply, stopStreamTracks, voicePlaybackEnabled]);

  const startRecording = useCallback(async () => {
    try {
      if (isRecording || status === "thinking") {
        return;
      }
      setError("");
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
      setStatus("listening");
    } catch (recordError) {
      console.error(recordError);
      setError(recordError.message || "Microphone access failed.");
      setStatus("idle");
      stopStreamTracks();
    }
  }, [handleRecordingStop, isRecording, status, stopStreamTracks]);

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== "recording") {
      return;
    }
    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }, []);

  return (
    <div className="appRoot">
      <Scene headLookAtEnabled={headLookAtEnabled} />

      <section className="controlPanel">
        <h1>Shuggi</h1>
        <p className="tagline">Real-time local avatar assistant</p>

        <div className="statusRow">
          <span className={`statusDot status-${status}`} />
          <span>{statusLabel}</span>
        </div>

        <div className="buttonRow">
          {!isRecording ? (
            <button className="primaryButton" onClick={startRecording}>
              Start Voice
            </button>
          ) : (
            <button className="primaryButton stopButton" onClick={stopRecording}>
              Stop & Send
            </button>
          )}
        </div>

        <label className="switchRow">
          <input
            type="checkbox"
            checked={headLookAtEnabled}
            onChange={(event) => setHeadLookAtEnabled(event.target.checked)}
          />
          Head look-at
        </label>

        <label className="switchRow">
          <input
            type="checkbox"
            checked={voicePlaybackEnabled}
            onChange={(event) => setVoicePlaybackEnabled(event.target.checked)}
          />
          Browser voice playback
        </label>

        {error ? <p className="errorText">{error}</p> : null}

        <div className="latestCard">
          <h2>Latest Turn</h2>
          <p>
            <strong>You:</strong> {latest?.transcript || "No transcript yet"}
          </p>
          <p>
            <strong>Shuggi:</strong> {latest?.reply || "No reply yet"}
          </p>
          <p>
            <strong>Emotion:</strong> {latest?.emotion || "neutral"}
          </p>
        </div>
      </section>
    </div>
  );
}
