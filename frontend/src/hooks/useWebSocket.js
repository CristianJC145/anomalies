import { useEffect, useRef, useCallback, useState } from 'react';

export function useWebSocket(url, onMessage) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        console.log('[WS] Connected');
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          onMessage(msg);
        } catch {}
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        console.log('[WS] Disconnected, reconnecting...');
        reconnectTimer.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    } catch (e) {
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, [url, onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected };
}
