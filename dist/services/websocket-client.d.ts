import { WebsocketResponse } from '../types/response-types';
/**
 * Create a WebSocket client for AWS API Gateway
 *
 * This factory function creates a WebSocket client that interfaces with AWS API Gateway Management API
 * to send messages and manage WebSocket connections. The client is initialized lazily when first used.
 *
 * @returns An object with methods to send messages, broadcast, and manage WebSocket connections
 */
export declare const CreateAWSWebSocketClient: () => {
    /**
     * Send a message to a specific connection
     *
     * @param endpoint - The WebSocket API Gateway endpoint URL
     * @param connectionId - The unique connection ID to send the message to
     * @param command - The command type/action for the message
     * @param data - The response payload to send
     * @returns Promise that resolves to true if sent successfully, false if connection is stale
     * @throws Error if sending fails for reasons other than stale connection (410)
     */
    sendToConnection: (endpoint: string, connectionId: string, command: string, data: WebsocketResponse) => Promise<boolean>;
    /**
     * Send a message to multiple connections
     * Returns array of connection IDs that failed (stale connections)
     *
     * @param endpoint - The WebSocket API Gateway endpoint URL
     * @param connectionIds - Array of connection IDs to send the message to
     * @param command - The command type/action for the message
     * @param data - The response payload to send
     * @returns Promise that resolves to an array of stale connection IDs (410 errors)
     */
    sendToConnections: (endpoint: string, connectionIds: string[], command: string, data: WebsocketResponse) => Promise<string[]>;
    /**
     * Broadcast a message to all connections in a list
     * Automatically handles stale connections
     *
     * @param endpoint - The WebSocket API Gateway endpoint URL
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
     * @param endpoint - The WebSocket API Gateway endpoint URL
     * @param connectionId - The connection ID to disconnect
     * @returns Promise that resolves when disconnection is complete
     * @throws Error if disconnection fails
     */
    disconnect: (endpoint: string, connectionId: string) => Promise<void>;
};
/**
 * Create a WebSocket client for offline/local development with serverless-offline
 *
 * serverless-offline requires us to use the real AWS SDK client even in offline mode
 * because it intercepts the calls and routes them to the local WebSocket connections.
 * This is different from production where we use the real AWS endpoint.
 *
 * @returns An object with methods that work with serverless-offline's WebSocket implementation
 */
export declare const CreateMockWebSocketClient: () => {
    /**
     * Send to connection via serverless-offline
     *
     * @param endpoint - The WebSocket API Gateway endpoint URL
     * @param connectionId - The connection ID
     * @param command - The command type/action
     * @param data - The response payload
     * @returns Promise that resolves to true if sent successfully
     */
    sendToConnection: (endpoint: string, connectionId: string, command: string, data: WebsocketResponse) => Promise<boolean>;
    /**
     * Send to multiple connections via serverless-offline
     *
     * @param endpoint - The WebSocket API Gateway endpoint URL
     * @param connectionIds - Array of connection IDs
     * @param command - The command type/action
     * @param data - The response payload
     * @returns Promise that resolves to array of stale connection IDs
     */
    sendToConnections: (endpoint: string, connectionIds: string[], command: string, data: WebsocketResponse) => Promise<string[]>;
    /**
     * Broadcast via serverless-offline
     *
     * @param endpoint - The WebSocket API Gateway endpoint URL
     * @param connectionIds - Array of connection IDs
     * @param command - The command type/action
     * @param data - The response payload
     * @returns Promise with sent count and stale connection IDs
     */
    broadcast: (endpoint: string, connectionIds: string[], command: string, data: WebsocketResponse) => Promise<{
        sent: number;
        stale: string[];
    }>;
    /**
     * Disconnect a connection via serverless-offline
     *
     * @param endpoint - The WebSocket API Gateway endpoint URL
     * @param connectionId - The connection ID to disconnect
     * @returns Promise that resolves when disconnection is complete
     */
    disconnect: (endpoint: string, connectionId: string) => Promise<void>;
};
export type WebSocketClient = ReturnType<typeof CreateAWSWebSocketClient>;
export declare const websocketClient: WebSocketClient;
//# sourceMappingURL=websocket-client.d.ts.map