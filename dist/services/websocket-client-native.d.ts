import { WebSocket } from 'ws';
import { WebsocketResponse } from '../types/response-types';
/**
 * Register a WebSocket connection
 *
 * @param connectionId - Unique connection identifier
 * @param ws - WebSocket instance
 */
export declare function registerConnection(connectionId: string, ws: WebSocket): void;
/**
 * Unregister a WebSocket connection
 *
 * @param connectionId - Unique connection identifier
 */
export declare function unregisterConnection(connectionId: string): void;
/**
 * Get a WebSocket connection by ID
 *
 * @param connectionId - Unique connection identifier
 * @returns WebSocket instance or undefined if not found
 */
export declare function getConnection(connectionId: string): WebSocket | undefined;
/**
 * Create a native WebSocket client for Express.js
 *
 * This replaces the AWS API Gateway Management API client with a native
 * WebSocket implementation that directly manages WebSocket connections.
 *
 * @returns An object with methods to send messages and manage WebSocket connections
 */
export declare const CreateNativeWebSocketClient: () => {
    /**
     * Send a message to a specific connection
     *
     * @param endpoint - Not used in native implementation (kept for compatibility)
     * @param connectionId - The unique connection ID to send the message to
     * @param command - The command type/action for the message
     * @param data - The response payload to send
     * @returns Promise that resolves to true if sent successfully, false if connection is stale
     */
    sendToConnection: (endpoint: string, connectionId: string, command: string, data: WebsocketResponse) => Promise<boolean>;
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
    sendToConnections: (endpoint: string, connectionIds: string[], command: string, data: WebsocketResponse) => Promise<string[]>;
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
    broadcast: (endpoint: string, connectionIds: string[], command: string, data: WebsocketResponse) => Promise<{
        sent: number;
        stale: string[];
    }>;
    /**
     * Disconnect a connection
     *
     * @param endpoint - Not used in native implementation (kept for compatibility)
     * @param connectionId - The connection ID to disconnect
     * @returns Promise that resolves when disconnection is complete
     */
    disconnect: (endpoint: string, connectionId: string) => Promise<void>;
};
export type NativeWebSocketClient = ReturnType<typeof CreateNativeWebSocketClient>;
export declare const websocketClientNative: {
    /**
     * Send a message to a specific connection
     *
     * @param endpoint - Not used in native implementation (kept for compatibility)
     * @param connectionId - The unique connection ID to send the message to
     * @param command - The command type/action for the message
     * @param data - The response payload to send
     * @returns Promise that resolves to true if sent successfully, false if connection is stale
     */
    sendToConnection: (endpoint: string, connectionId: string, command: string, data: WebsocketResponse) => Promise<boolean>;
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
    sendToConnections: (endpoint: string, connectionIds: string[], command: string, data: WebsocketResponse) => Promise<string[]>;
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
    broadcast: (endpoint: string, connectionIds: string[], command: string, data: WebsocketResponse) => Promise<{
        sent: number;
        stale: string[];
    }>;
    /**
     * Disconnect a connection
     *
     * @param endpoint - Not used in native implementation (kept for compatibility)
     * @param connectionId - The connection ID to disconnect
     * @returns Promise that resolves when disconnection is complete
     */
    disconnect: (endpoint: string, connectionId: string) => Promise<void>;
};
//# sourceMappingURL=websocket-client-native.d.ts.map