import { WebSocket } from 'ws';
import logger from '../utils/logger';
import { WebsocketResponse } from '../types/response-types';

/**
 * Map to store active WebSocket connections by connectionId
 */
const connections = new Map<string, WebSocket>();

/**
 * Register a WebSocket connection
 *
 * @param connectionId - Unique connection identifier
 * @param ws - WebSocket instance
 */
export function registerConnection(connectionId: string, ws: WebSocket): void {
  connections.set(connectionId, ws);
  logger.debug(`Registered WebSocket connection: ${connectionId}`);
}

/**
 * Unregister a WebSocket connection
 *
 * @param connectionId - Unique connection identifier
 */
export function unregisterConnection(connectionId: string): void {
  connections.delete(connectionId);
  logger.debug(`Unregistered WebSocket connection: ${connectionId}`);
}

/**
 * Get a WebSocket connection by ID
 *
 * @param connectionId - Unique connection identifier
 * @returns WebSocket instance or undefined if not found
 */
export function getConnection(connectionId: string): WebSocket | undefined {
  return connections.get(connectionId);
}

/**
 * Create a native WebSocket client for Express.js
 *
 * This replaces the AWS API Gateway Management API client with a native
 * WebSocket implementation that directly manages WebSocket connections.
 *
 * @returns An object with methods to send messages and manage WebSocket connections
 */
export const CreateNativeWebSocketClient = () => {
  return {
    /**
     * Send a message to a specific connection
     *
     * @param endpoint - Not used in native implementation (kept for compatibility)
     * @param connectionId - The unique connection ID to send the message to
     * @param command - The command type/action for the message
     * @param data - The response payload to send
     * @returns Promise that resolves to true if sent successfully, false if connection is stale
     */
    sendToConnection: (
      endpoint: string,
      connectionId: string,
      command: string,
      data: WebsocketResponse
    ): Promise<boolean> => {
      return Promise.resolve().then(() => {
        try {
          const ws = connections.get(connectionId);
          if (!ws || ws.readyState !== WebSocket.OPEN) {
            logger.info(`Connection ${connectionId} is not available or closed`);
            return false;
          }

          const payload = { command, ...data };
          ws.send(JSON.stringify(payload));
          return true;
        } catch (error) {
          logger.error(`Failed to send message to ${connectionId}:`, error);
          return false;
        }
      });
    },

    /**
     * Send a message to multiple connections
     * Returns array of connection IDs that failed (stale connections)
     *
     * @param endpoint - Not used in native implementation (kept for compatibility)
     * @param connectionIds - Array of connection IDs to send the message to
     * @param command - The command type/action for the message
     * @param data - The response payload to send
     * @returns Promise that resolves to an array of stale connection IDs
     */
    sendToConnections: (
      endpoint: string,
      connectionIds: string[],
      command: string,
      data: WebsocketResponse
    ): Promise<string[]> => {
      const staleConnections: string[] = [];

      return Promise.all(
        connectionIds.map((connectionId) => {
          try {
            const ws = connections.get(connectionId);
            if (!ws || ws.readyState !== WebSocket.OPEN) {
              staleConnections.push(connectionId);
              return Promise.resolve();
            }

            const payload = { command, ...data };
            ws.send(JSON.stringify(payload));
            return Promise.resolve();
          } catch (error) {
            logger.error(`Failed to send message to ${connectionId}:`, error);
            staleConnections.push(connectionId);
            return Promise.resolve();
          }
        })
      ).then(() => staleConnections);
    },

    /**
     * Broadcast a message to all connections in a list
     * Automatically handles stale connections
     *
     * @param endpoint - Not used in native implementation (kept for compatibility)
     * @param connectionIds - Array of connection IDs to broadcast to
     * @param command - The command type/action for the message
     * @param data - The response payload to broadcast
     * @returns Promise that resolves to an object with sent count and array of stale connection IDs
     */
    broadcast: (
      endpoint: string,
      connectionIds: string[],
      command: string,
      data: WebsocketResponse
    ): Promise<{ sent: number; stale: string[] }> => {
      const staleConnections: string[] = [];

      return Promise.all(
        connectionIds.map((connectionId) => {
          try {
            const ws = connections.get(connectionId);
            if (!ws || ws.readyState !== WebSocket.OPEN) {
              staleConnections.push(connectionId);
              return Promise.resolve();
            }

            const payload = { command, ...data };
            ws.send(JSON.stringify(payload));
            return Promise.resolve();
          } catch (error) {
            logger.error(`Failed to send message to ${connectionId}:`, error);
            staleConnections.push(connectionId);
            return Promise.resolve();
          }
        })
      ).then(() => ({
        sent: connectionIds.length - staleConnections.length,
        stale: staleConnections
      }));
    },

    /**
     * Disconnect a connection
     *
     * @param endpoint - Not used in native implementation (kept for compatibility)
     * @param connectionId - The connection ID to disconnect
     * @returns Promise that resolves when disconnection is complete
     */
    disconnect: (endpoint: string, connectionId: string): Promise<void> => {
      return Promise.resolve().then(() => {
        try {
          const ws = connections.get(connectionId);
          if (ws) {
            ws.close(1000, 'Server disconnect');
            connections.delete(connectionId);
            logger.debug(`Disconnected WebSocket connection: ${connectionId}`);
          }
        } catch (error) {
          logger.error(`Failed to disconnect ${connectionId}:`, error);
          throw error;
        }
      });
    }
  };
};

export type NativeWebSocketClient = ReturnType<typeof CreateNativeWebSocketClient>;
export const websocketClientNative = CreateNativeWebSocketClient();
