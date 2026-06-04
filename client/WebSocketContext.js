import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext({
  isConnected: false,
  addListener: () => {},
  removeListener: () => {},
  sendMessage: () => {},
});

import { WS_URL as BASE_WS_URL } from './config';
const WS_URL = `${BASE_WS_URL}/ws`;

export const WebSocketProvider = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const listenersRef = useRef(new Map());
  const reconnectTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const intentionalCloseRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // 用ref存储最新值，避免闭包过期
  const authRef = useRef({ accessToken, isAuthenticated });
  authRef.current = { accessToken, isAuthenticated };

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // 未登录，断开连接
      intentionalCloseRef.current = true;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // 已登录，建立连接
    intentionalCloseRef.current = false;

    const connect = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
      if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) return;

      try {
        const ws = new WebSocket(`${WS_URL}?token=${accessToken}`);

        ws.onopen = () => {
          setIsConnected(true);
          // 启动心跳：每45秒发ping
          heartbeatTimerRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try { ws.send(JSON.stringify({ type: 'ping' })); } catch (e) {}
            }
          }, 45000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'pong') return; // 心跳回复，不分发

            const { type } = data;
            if (type) {
              const typeListeners = listenersRef.current.get(type);
              if (typeListeners) {
                typeListeners.forEach((cb) => {
                  try { cb(data); } catch (err) {}
                });
              }
              const allListeners = listenersRef.current.get('*');
              if (allListeners) {
                allListeners.forEach((cb) => {
                  try { cb(data); } catch (err) {}
                });
              }
            }
          } catch (err) {}
        };

        ws.onclose = () => {
          setIsConnected(false);
          wsRef.current = null;
          if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
          }
          // 自动重连（3秒后）
          if (authRef.current.isAuthenticated && !intentionalCloseRef.current) {
            reconnectTimerRef.current = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {};

        wsRef.current = ws;
      } catch (err) {}
    };

    connect();

    return () => {
      intentionalCloseRef.current = true;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, accessToken, clearTimers]);

  const addListener = useCallback((type, callback) => {
    if (!listenersRef.current.has(type)) {
      listenersRef.current.set(type, new Set());
    }
    listenersRef.current.get(type).add(callback);
  }, []);

  const removeListener = useCallback((type, callback) => {
    if (listenersRef.current.has(type)) {
      listenersRef.current.get(type).delete(callback);
      if (listenersRef.current.get(type).size === 0) {
        listenersRef.current.delete(type);
      }
    }
  }, []);

  const sendMessage = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const msg = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.current.send(msg);
    }
  }, []);

  const wsContextValue = useMemo(() => ({
    isConnected, addListener, removeListener, sendMessage
  }), [isConnected, addListener, removeListener, sendMessage]);

  return (
    <WebSocketContext.Provider value={wsContextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
