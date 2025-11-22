import type { WebSocket } from 'ws';
import logger from '../utils/logger';
import { WebsocketResponse } from '../types/response-types';

type ConnectionMap = Map<string, WebSocket>;

let connectionMap: ConnectionMap = new Map();

export function registerConnection(connectionId: string, ws: WebSocket): void {
  connectionMap.set(connectionId, ws);
  ws.on('close', () => {
    connectionMap.delete(connectionId);
  });
  ws.on('error', () => {
    connectionMap.delete(connectionId);
  });
}

export function unregisterConnection(connectionId: string): void {
  connectionMap.delete(connectionId);
}

export function getConnection(connectionId: string): WebSocket | undefined {
  return connectionMap.get(connectionId);
}

export const CreateNativeWebSocketClient = () => {
  return {
    sendToConnection: async (
      connectionId: string,
      command: string,
      data: WebsocketResponse
    ): Promise<boolean> => {
      try {
        const ws = connectionMap.get(connectionId);
        if (!ws || ws.readyState !== 1) {
          logger.info(`Connection ${connectionId} is not available`);
          return false;
        }

        ws.send(JSON.stringify({ command, ...data }));
        return true;
      } catch (error) {
        logger.error(`Failed to send message to ${connectionId}:`, error);
        connectionMap.delete(connectionId);
        return false;
      }
    },

    sendToConnections: async (
      connectionIds: string[],
      command: string,
      data: WebsocketResponse
    ): Promise<string[]> => {
      const staleConnections: string[] = [];

      await Promise.all(
        connectionIds.map(async (connectionId) => {
          try {
            const ws = connectionMap.get(connectionId);
            if (!ws || ws.readyState !== 1) {
              staleConnections.push(connectionId);
              return;
            }

            ws.send(JSON.stringify({ command, ...data }));
          } catch (error) {
            logger.error(`Failed to send message to ${connectionId}:`, error);
            staleConnections.push(connectionId);
            connectionMap.delete(connectionId);
          }
        })
      );

      return staleConnections;
    },

    broadcast: async (
      connectionIds: string[],
      command: string,
      data: WebsocketResponse
    ): Promise<{ sent: number; stale: string[] }> => {
      const staleConnections: string[] = [];

      await Promise.all(
        connectionIds.map(async (connectionId) => {
          try {
            const ws = connectionMap.get(connectionId);
            if (!ws || ws.readyState !== 1) {
              staleConnections.push(connectionId);
              return;
            }

            ws.send(JSON.stringify({ command, ...data }));
          } catch (error) {
            logger.error(`Failed to send message to ${connectionId}:`, error);
            staleConnections.push(connectionId);
            connectionMap.delete(connectionId);
          }
        })
      );

      return {
        sent: connectionIds.length - staleConnections.length,
        stale: staleConnections
      };
    },

    disconnect: async (connectionId: string): Promise<void> => {
      try {
        const ws = connectionMap.get(connectionId);
        if (ws) {
          ws.close();
          connectionMap.delete(connectionId);
        }
      } catch (error) {
        logger.error(`Failed to disconnect ${connectionId}:`, error);
        connectionMap.delete(connectionId);
      }
    }
  };
};

export type WebSocketClient = ReturnType<typeof CreateNativeWebSocketClient>;
export const websocketClient = CreateNativeWebSocketClient();
