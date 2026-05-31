import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext({
  isConnected: false,
  addListener: () => {},
  removeListener: () => {},
  sendMessage: () => {},
});

export const WebSocketProvider = ({ children }) => {
  const { accessToken, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const listenersRef = useRef(new Map());
  const reconnectTimerRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    try {
      const ws = new WebSocket(`ws://192.168.43.231:5000/ws?token=${accessToken}`);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type } = data;
          if (type) {
            const typeListeners = listenersRef.current.get(type);
            if (typeListeners) {
              typeListeners.forEach((cb) => {
                try {
                  cb(data);
                } catch (err) {
                  console.error(`WebSocket listener error for type "${type}":`, err);
                }
              });
            }
            const allListeners = listenersRef.current.get('*');
            if (allListeners) {
              allListeners.forEach((cb) => {
                try {
                  cb(data);
                } catch (err) {
                  console.error(`WebSocket listener error for "*":`, err);
                }
              });
            }
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (isAuthenticated) {
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket connect error:', err);
    }
  }, [accessToken, isAuthenticated]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

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

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [isAuthenticated, accessToken, connect, disconnect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, addListener, removeListener, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
