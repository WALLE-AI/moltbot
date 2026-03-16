import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WebSocketMessage {
  type: string;
  data: unknown;
}

interface UseWebSocketOptions {
  url?: string;
  onMessage?: (message: WebSocketMessage) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  reconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`,
    onMessage,
    onStatusChange,
    reconnect = true,
    reconnectInterval = 5000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<WebSocketStatus>('disconnected');
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    const wsUrl = `${url}?token=${token}`;

    try {
      statusRef.current = 'connecting';
      onStatusChange?.('connecting');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        statusRef.current = 'connected';
        onStatusChange?.('connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          onMessage?.(message);
        } catch {
          console.error('Failed to parse WebSocket message');
        }
      };

      ws.onclose = () => {
        statusRef.current = 'disconnected';
        onStatusChange?.('disconnected');
        wsRef.current = null;

        if (reconnect) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };

      ws.onerror = () => {
        statusRef.current = 'error';
        onStatusChange?.('error');
      };
    } catch {
      statusRef.current = 'error';
      onStatusChange?.('error');
    }
  }, [url, onMessage, onStatusChange, reconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((type: string, data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (token) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status: statusRef.current,
    connect,
    disconnect,
    send,
  };
}
