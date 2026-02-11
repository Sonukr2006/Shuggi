/**
 * WebSocket Server Configuration
 * Production-grade Socket.io setup with middleware and connection management
 */

import { Server } from 'socket.io';
import { queryRouter } from './utils/queryRouter.js';
import { responseCache } from './utils/responseCache.js';
import { generateAssistantReply } from './llm/ollama.js';
import { detectEmotion } from './utils/emotion.js';
import { transcribeAudioBuffer } from './voice/stt.js';
import { config } from './config.js';

// Production metrics
const metrics = {
  activeConnections: 0,
  totalConnections: 0,
  messagesProcessed: 0,
  errorsEncountered: 0,
};

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: config.maxAudioMb * 1024 * 1024,
    pingInterval: 25000,
    pingTimeout: 10000,
  });

  // Connection middleware
  io.use((socket, next) => {
    const clientId = socket.handshake.query.clientId || socket.id;
    socket.clientId = clientId;
    
    console.log(`[WS] Connection: ${clientId}`);
    next();
  });

  // Connection handler
  io.on('connection', (socket) => {
    metrics.activeConnections++;
    metrics.totalConnections++;

    console.log(`[WS] Client connected: ${socket.clientId} (Total: ${metrics.activeConnections})`);
    
    // Emit connection success
    socket.emit('connected', {
      clientId: socket.clientId,
      timestamp: new Date().toISOString(),
    });

    // Voice chat handler
    socket.on('voice-stream', (audioBuffer) => {
      handleVoiceStream(socket, audioBuffer);
    });

    // Text chat handler
    socket.on('text-message', (message) => {
      handleTextMessage(socket, message);
    });

    // Emotion request
    socket.on('request-emotion', (text) => {
      handleEmotionDetection(socket, text);
    });

    // Query routing info
    socket.on('query-routing-info', (query) => {
      const decision = queryRouter.getDecisionWithMetadata(query);
      socket.emit('routing-info', decision);
    });

    // Request stats
    socket.on('request-stats', () => {
      socket.emit('stats', {
        queryRouter: queryRouter.getStats(),
        responseCache: responseCache.getStats(),
        serverMetrics: metrics,
      });
    });

    // Ping handler (keep-alive)
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      metrics.activeConnections--;
      console.log(`[WS] Client disconnected: ${socket.clientId} (Remaining: ${metrics.activeConnections})`);
    });

    // Error handler
    socket.on('error', (error) => {
      metrics.errorsEncountered++;
      console.error(`[WS] Socket error from ${socket.clientId}:`, error);
      socket.emit('error-response', {
        error: 'socket_error',
        message: 'Connection error occurred',
      });
    });
  });

  return io;
}

/**
 * Handle voice stream processing
 */
async function handleVoiceStream(socket, audioBuffer) {
  try {
    const clientId = socket.clientId;
    console.log(`[WS] Voice stream received from ${clientId}`);

    socket.emit('status', { status: 'transcribing', message: 'Converting speech to text...' });

    // Transcribe audio
    const transcription = await transcribeAudioBuffer(Buffer.from(audioBuffer), 'audio/webm');
    const transcript = transcription.text;

    if (!transcript) {
      socket.emit('transcript', { transcript: '' });
      socket.emit('status', { status: 'idle', message: 'No speech detected' });
      return;
    }

    socket.emit('transcript', { transcript });
    socket.emit('status', { status: 'processing', message: 'Generating response...' });

    // Check routing decision
    const useCloud = queryRouter.shouldUseCloud(transcript);
    socket.emit('routing-decision', { useCloud });

    // Check cache first
    let reply = responseCache.get(transcript);
    let fromCache = false;

    if (reply) {
      fromCache = true;
      console.log(`[WS] Cache hit for: "${transcript}"`);
    } else {
      // Generate new response
      reply = await generateAssistantReply(transcript, useCloud);
      responseCache.set(transcript, reply, { useCloud });
    }

    // Detect emotion
    socket.emit('status', { status: 'analyzing', message: 'Analyzing emotion...' });
    const emotion = detectEmotion(reply);

    // Send response with metadata
    socket.emit('response', {
      reply,
      emotion,
      fromCache,
      timestamp: new Date().toISOString(),
    });

    socket.emit('status', { status: 'idle', message: 'Ready' });

    metrics.messagesProcessed++;

  } catch (error) {
    metrics.errorsEncountered++;
    console.error(`[WS] Voice processing error for ${socket.clientId}:`, error);
    
    socket.emit('error-response', {
      error: 'voice_processing_failed',
      message: error.message || 'Failed to process voice',
    });
    socket.emit('status', { status: 'idle', message: 'Error' });
  }
}

/**
 * Handle text message processing
 */
async function handleTextMessage(socket, message) {
  try {
    if (!message || typeof message !== 'string') {
      socket.emit('error-response', {
        error: 'invalid_message',
        message: 'Message must be non-empty string',
      });
      return;
    }

    const clientId = socket.clientId;
    console.log(`[WS] Text message from ${clientId}: "${message.substring(0, 50)}..."`);

    socket.emit('status', { status: 'processing', message: 'Processing...' });

    // Check cache
    let reply = responseCache.get(message);
    let fromCache = false;

    if (reply) {
      fromCache = true;
      console.log(`[WS] Cache hit for text message`);
    } else {
      // Check routing
      const useCloud = queryRouter.shouldUseCloud(message);
      
      // Generate response
      reply = await generateAssistantReply(message, useCloud);
      responseCache.set(message, reply, { useCloud });
    }

    // Detect emotion
    const emotion = detectEmotion(reply);

    socket.emit('response', {
      reply,
      emotion,
      fromCache,
      timestamp: new Date().toISOString(),
    });

    socket.emit('status', { status: 'idle', message: 'Ready' });

    metrics.messagesProcessed++;

  } catch (error) {
    metrics.errorsEncountered++;
    console.error(`[WS] Text processing error for ${socket.clientId}:`, error);
    
    socket.emit('error-response', {
      error: 'text_processing_failed',
      message: error.message || 'Failed to process message',
    });
    socket.emit('status', { status: 'idle', message: 'Error' });
  }
}

/**
 * Handle emotion detection
 */
async function handleEmotionDetection(socket, text) {
  try {
    if (!text) {
      socket.emit('error-response', {
        error: 'invalid_input',
        message: 'Text required for emotion detection',
      });
      return;
    }

    const emotion = detectEmotion(text);
    socket.emit('emotion-result', { emotion });

  } catch (error) {
    console.error(`[WS] Emotion detection error:`, error);
    socket.emit('error-response', {
      error: 'emotion_detection_failed',
      message: 'Failed to detect emotion',
    });
  }
}

/**
 * Get server metrics
 */
export function getServerMetrics() {
  return {
    ...metrics,
    queryRouter: queryRouter.getStats(),
    responseCache: responseCache.getStats(),
  };
}

/**
 * Reset metrics
 */
export function resetMetrics() {
  metrics.messagesProcessed = 0;
  metrics.errorsEncountered = 0;
  queryRouter.resetStats();
}
