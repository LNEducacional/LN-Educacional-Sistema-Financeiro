import { useEffect, useRef, useState, useCallback } from 'react';

interface UseSSEOptions<T> {
  url: string;
  token?: string;
  eventName?: string;
  onMessage: (data: T) => void;
  onConnect?: () => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
  maxRetries?: number;
}

interface UseSSEReturn {
  isConnected: boolean;
  error: Event | null;
  reconnect: () => void;
  disconnect: () => void;
}

const baseDelay = 1000; // 1 segundo
const maxReconnectDelay = 30000; // 30 segundos

export function useSSE<T>({
  url,
  token,
  eventName = 'message',
  onMessage,
  onConnect,
  onError,
  enabled = true,
  maxRetries = 5,
}: UseSSEOptions<T>): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    if (!enabled || !token) return;

    // Construir URL com token se necessário
    const fullUrl = token ? `${url}?token=${token}` : url;

    const eventSource = new EventSource(fullUrl);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      retryCountRef.current = 0;
      onConnect?.();
    };

    eventSource.addEventListener(eventName, (event) => {
      try {
        const data = JSON.parse(event.data) as T;
        onMessage(data);
      } catch (e) {
        console.error('Error parsing SSE data:', e);
      }
    });

    eventSource.onerror = (err) => {
      setIsConnected(false);
      setError(err);
      onError?.(err);
      eventSource.close();
      eventSourceRef.current = null;

      // Exponential backoff
      if (retryCountRef.current < maxRetries) {
        const delay = Math.min(maxReconnectDelay, baseDelay * Math.pow(2, retryCountRef.current));
        retryCountRef.current++;
        retryTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    eventSourceRef.current = eventSource;
  }, [url, token, eventName, onMessage, onConnect, onError, enabled, maxRetries]);

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    retryCountRef.current = 0;
    connect();
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, error, reconnect, disconnect };
}
