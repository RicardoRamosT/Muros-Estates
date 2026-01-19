import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import type { Typology } from "@shared/schema";

export function usePublicTypologies() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const mountedRef = useRef(true);

  const { data: typologies = [], isLoading, refetch } = useQuery<Typology[]>({
    queryKey: ["/api/public/typologies"],
  });

  useEffect(() => {
    mountedRef.current = true;

    const connectWebSocket = () => {
      if (!mountedRef.current) return;
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      try {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          return;
        }
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mountedRef.current) return;
          console.log("WebSocket connected for real-time updates");
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === "typology") {
              queryClient.invalidateQueries({ queryKey: ["/api/public/typologies"] });
            }
          } catch (e) {
            // Silent fail for parsing errors
          }
        };

        ws.onerror = () => {
          // Silent fail for connection errors
        };

        ws.onclose = () => {
          if (!mountedRef.current) return;
          console.log("WebSocket disconnected");
          setIsConnected(false);
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connectWebSocket();
            }
          }, 5000);
        };
      } catch (error) {
        // Silent fail for WebSocket errors
      }
    };

    connectWebSocket();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return {
    typologies,
    isLoading,
    isConnected,
    refetch,
  };
}
