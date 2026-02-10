/**
 * useVoiceChat Hook - Production-grade WebSocket integration
 * Handles real-time voice communication with automatic reconnection
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const useVoiceChat = (onResponseReceived) => {
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const connectionAttemptsRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('disconnected');
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [routingDecision, setRoutingDecision] = useState(null);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      socketRef.current = io(API_BASE_URL, {
        query: { clientId },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling'],
      });

      /**
       * Connection established
       */
      socketRef.current.on('connected', (data) => {
        console.log('[WS] Connected:', data);
        setIsConnected(true);
        setStatus('idle');
        setError(null);
        connectionAttemptsRef.current = 0;
      });

      /**
       * Status updates
       */
      socketRef.current.on('status', (data) => {
        console.log('[WS] Status:', data.status);
        setStatus(data.status);
      });

      /**
       * Transcript received
       */
      socketRef.current.on('transcript', (data) => {
        console.log('[WS] Transcript:', data.transcript);
        if (onResponseReceived) {
          onResponseReceived({
            type: 'transcript',
            content: data.transcript,
          });
        }
      });

      /**
       * Routing decision
       */
      socketRef.current.on('routing-decision', (data) => {
        console.log('[WS] Routing:', data.useCloud ? 'Cloud' : 'Local');
        setRoutingDecision(data);
      });

      /**
       * Response received
       */
      socketRef.current.on('response', (data) => {
        console.log('[WS] Response:', data.reply.substring(0, 50) + '...');
        setCurrentEmotion(data.emotion);
        
        if (onResponseReceived) {
          onResponseReceived({
            type: 'response',
            content: data.reply,
            emotion: data.emotion,
            fromCache: data.fromCache,
            timestamp: data.timestamp,
          });
        }
      });

      /**
       * Emotion result
       */
      socketRef.current.on('emotion-result', (data) => {
        console.log('[WS] Emotion:', data.emotion);
        setCurrentEmotion(data.emotion);
      });

      /**
       * Metrics
       */
      socketRef.current.on('stats', (data) => {
        console.log('[WS] Stats:', data);
        setMetrics(data);
      });

      /**
       * Error handling
       */
      socketRef.current.on('error-response', (data) => {
        console.error('[WS] Error:', data);
        setError(data);
        setStatus('idle');
      });

      /**
       * Keep-alive ping
       */
      socketRef.current.on('pong', (data) => {
        console.log('[WS] Pong received');
      });

      /**
       * Disconnect handler
       */
      socketRef.current.on('disconnect', () => {
        console.log('[WS] Disconnected');
        setIsConnected(false);
        setStatus('disconnected');
        attemptReconnect();
      });

      /**
       * Connection error
       */
      socketRef.current.on('connect_error', (error) => {
        console.error('[WS] Connection error:', error);
        setError({ error: 'connection_failed', message: error.message });
        attemptReconnect();
      });

    } catch (err) {
      console.error('[WS] Failed to initialize socket:', err);
      setError({
        error: 'initialization_failed',
        message: err.message,
      });
      attemptReconnect();
    }
  }, [onResponseReceived]);

  /**
   * Attempt to reconnect with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    if (connectionAttemptsRef.current >= 10) {
      console.error('[WS] Max reconnection attempts reached');
      setError({
        error: 'connection_failed',
        message: 'Unable to connect to server',
      });
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, connectionAttemptsRef.current), 5000);
    connectionAttemptsRef.current++;

    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${connectionAttemptsRef.current})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  /**
   * Send voice audio
   */
  const sendVoiceAudio = useCallback(async (audioBlob) => {
    if (!socketRef.current?.connected) {
      setError({
        error: 'not_connected',
        message: 'Not connected to server',
      });
      return;
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      socketRef.current.emit('voice-stream', arrayBuffer);
    } catch (err) {
      console.error('[WS] Failed to send voice:', err);
      setError({
        error: 'send_failed',
        message: err.message,
      });
    }
  }, []);

  /**
   * Send text message
   */
  const sendTextMessage = useCallback((message) => {
    if (!socketRef.current?.connected) {
      setError({
        error: 'not_connected',
        message: 'Not connected to server',
      });
      return;
    }

    socketRef.current.emit('text-message', message);
  }, []);

  /**
   * Request emotion detection
   */
  const requestEmotionDetection = useCallback((text) => {
    if (!socketRef.current?.connected) {
      return;
    }

    socketRef.current.emit('request-emotion', text);
  }, []);

  /**
   * Get routing info
   */
  const getRoutingInfo = useCallback((query) => {
    if (!socketRef.current?.connected) {
      return;
    }

    socketRef.current.emit('query-routing-info', query);
  }, []);

  /**
   * Request server metrics
   */
  const requestMetrics = useCallback(() => {
    if (!socketRef.current?.connected) {
      return;
    }

    socketRef.current.emit('request-stats');
  }, []);

  /**
   * Send keep-alive ping
   */
  const sendPing = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('ping');
    }
  }, []);

  /**
   * Cleanup on unmount or disconnect
   */
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  /**
   * Initial connection
   */
  useEffect(() => {
    connect();
  }, []);

  /**
   * Keep-alive ping interval
   */
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      sendPing();
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isConnected, sendPing]);

  return {
    isConnected,
    status,
    error,
    currentEmotion,
    routingDecision,
    metrics,
    sendVoiceAudio,
    sendTextMessage,
    requestEmotionDetection,
    getRoutingInfo,
    requestMetrics,
    reconnect: connect,
  };
};

export default useVoiceChat;
