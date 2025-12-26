import { ApiGatewayManagementApiClient, PostToConnectionCommand, DeleteConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import logger from '../utils/logger';
import { isTrue } from '../utils/lib';
/**
 * Create a WebSocket client for AWS API Gateway
 *
 * This factory function creates a WebSocket client that interfaces with AWS API Gateway Management API
 * to send messages and manage WebSocket connections. The client is initialized lazily when first used.
 *
 * @returns An object with methods to send messages, broadcast, and manage WebSocket connections
 */
export const CreateAWSWebSocketClient = () => {
    let client = null;
    /**
     * Initialize the client with the WebSocket endpoint
     * This is called lazily because the endpoint URL is only available at runtime
     *
     * @param endpoint - The WebSocket API Gateway endpoint URL
     * @returns The initialized ApiGatewayManagementApiClient instance
     */
    const getClient = (endpoint) => {
        if (!client) {
            client = new ApiGatewayManagementApiClient({
                endpoint
            });
        }
        return client;
    };
    return {
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
        sendToConnection: async (endpoint, connectionId, command, data) => {
            try {
                const apiClient = getClient(endpoint);
                await apiClient.send(new PostToConnectionCommand({
                    ConnectionId: connectionId,
                    Data: Buffer.from(JSON.stringify({ command, ...data }))
                }));
                return true;
            }
            catch (error) {
                if (error.statusCode === 410) {
                    logger.info(`Connection ${connectionId} is stale, marking for deletion`);
                    return false; // Connection is gone
                }
                logger.error(`Failed to send message to ${connectionId}:`, error);
                throw error;
            }
        },
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
        sendToConnections: async (endpoint, connectionIds, command, data) => {
            const staleConnections = [];
            await Promise.all(connectionIds.map(async (connectionId) => {
                const apiClient = getClient(endpoint);
                try {
                    await apiClient.send(new PostToConnectionCommand({
                        ConnectionId: connectionId,
                        Data: Buffer.from(JSON.stringify({ command, ...data }))
                    }));
                }
                catch (error) {
                    if (error.statusCode === 410) {
                        staleConnections.push(connectionId);
                    }
                    else {
                        logger.error(`Failed to send message to ${connectionId}:`, error);
                    }
                }
            }));
            return staleConnections;
        },
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
        broadcast: async (endpoint, connectionIds, command, data) => {
            const staleConnections = [];
            await Promise.all(connectionIds.map(async (connectionId) => {
                const apiClient = getClient(endpoint);
                try {
                    await apiClient.send(new PostToConnectionCommand({
                        ConnectionId: connectionId,
                        Data: Buffer.from(JSON.stringify({ command, ...data }))
                    }));
                }
                catch (error) {
                    if (error.statusCode === 410) {
                        staleConnections.push(connectionId);
                    }
                    else {
                        logger.error(`Failed to send message to ${connectionId}:`, error);
                    }
                }
            }));
            return {
                sent: connectionIds.length - staleConnections.length,
                stale: staleConnections
            };
        },
        /**
         * Disconnect a connection
         *
         * @param endpoint - The WebSocket API Gateway endpoint URL
         * @param connectionId - The connection ID to disconnect
         * @returns Promise that resolves when disconnection is complete
         * @throws Error if disconnection fails
         */
        disconnect: async (endpoint, connectionId) => {
            try {
                const apiClient = getClient(endpoint);
                await apiClient.send(new DeleteConnectionCommand({
                    ConnectionId: connectionId
                }));
            }
            catch (error) {
                logger.error(`Failed to disconnect ${connectionId}:`, error);
                throw error;
            }
        }
    };
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
export const CreateMockWebSocketClient = () => {
    logger.info('[OFFLINE MODE] Using serverless-offline WebSocket client');
    // serverless-offline requires the real AWS SDK client
    // It intercepts the calls at the network level
    let client = null;
    const getClient = (endpoint) => {
        if (!client) {
            // For serverless-offline, we need to use the real client
            // It will connect to http://localhost:6001 (or configured WS port)
            client = new ApiGatewayManagementApiClient({
                endpoint
            });
        }
        return client;
    };
    return {
        /**
         * Send to connection via serverless-offline
         *
         * @param endpoint - The WebSocket API Gateway endpoint URL
         * @param connectionId - The connection ID
         * @param command - The command type/action
         * @param data - The response payload
         * @returns Promise that resolves to true if sent successfully
         */
        sendToConnection: async (endpoint, connectionId, command, data) => {
            try {
                const apiClient = getClient(endpoint);
                const payload = { command, ...data };
                logger.debug(`[OFFLINE MODE] Sending to ${connectionId}:`, payload);
                await apiClient.send(new PostToConnectionCommand({
                    ConnectionId: connectionId,
                    Data: Buffer.from(JSON.stringify(payload))
                }));
                return true;
            }
            catch (error) {
                if (error.statusCode === 410) {
                    logger.info(`[OFFLINE MODE] Connection ${connectionId} is stale`);
                    return false;
                }
                logger.error(`[OFFLINE MODE] Failed to send to ${connectionId}:`, error);
                throw error;
            }
        },
        /**
         * Send to multiple connections via serverless-offline
         *
         * @param endpoint - The WebSocket API Gateway endpoint URL
         * @param connectionIds - Array of connection IDs
         * @param command - The command type/action
         * @param data - The response payload
         * @returns Promise that resolves to array of stale connection IDs
         */
        sendToConnections: async (endpoint, connectionIds, command, data) => {
            const staleConnections = [];
            const apiClient = getClient(endpoint);
            await Promise.all(connectionIds.map(async (connectionId) => {
                try {
                    await apiClient.send(new PostToConnectionCommand({
                        ConnectionId: connectionId,
                        Data: Buffer.from(JSON.stringify({ command, ...data }))
                    }));
                }
                catch (error) {
                    if (error.statusCode === 410) {
                        staleConnections.push(connectionId);
                    }
                    else {
                        logger.error(`[OFFLINE MODE] Failed to send to ${connectionId}:`, error);
                    }
                }
            }));
            logger.debug(`[OFFLINE MODE] Sent to ${connectionIds.length} connections, ${staleConnections.length} stale`);
            return staleConnections;
        },
        /**
         * Broadcast via serverless-offline
         *
         * @param endpoint - The WebSocket API Gateway endpoint URL
         * @param connectionIds - Array of connection IDs
         * @param command - The command type/action
         * @param data - The response payload
         * @returns Promise with sent count and stale connection IDs
         */
        broadcast: async (endpoint, connectionIds, command, data) => {
            const staleConnections = [];
            const apiClient = getClient(endpoint);
            await Promise.all(connectionIds.map(async (connectionId) => {
                try {
                    await apiClient.send(new PostToConnectionCommand({
                        ConnectionId: connectionId,
                        Data: Buffer.from(JSON.stringify({ command, ...data }))
                    }));
                }
                catch (error) {
                    if (error.statusCode === 410) {
                        staleConnections.push(connectionId);
                    }
                    else {
                        logger.error(`[OFFLINE MODE] Failed to send to ${connectionId}:`, error);
                    }
                }
            }));
            logger.debug(`[OFFLINE MODE] Broadcast to ${connectionIds.length} connections, ${staleConnections.length} stale`);
            return {
                sent: connectionIds.length - staleConnections.length,
                stale: staleConnections
            };
        },
        /**
         * Disconnect a connection via serverless-offline
         *
         * @param endpoint - The WebSocket API Gateway endpoint URL
         * @param connectionId - The connection ID to disconnect
         * @returns Promise that resolves when disconnection is complete
         */
        disconnect: async (endpoint, connectionId) => {
            try {
                const apiClient = getClient(endpoint);
                await apiClient.send(new DeleteConnectionCommand({
                    ConnectionId: connectionId
                }));
                logger.debug(`[OFFLINE MODE] Disconnected ${connectionId}`);
            }
            catch (error) {
                logger.error(`[OFFLINE MODE] Failed to disconnect ${connectionId}:`, error);
                throw error;
            }
        }
    };
};
export const websocketClient = isTrue(process.env.IS_OFFLINE)
    ? CreateMockWebSocketClient()
    : CreateAWSWebSocketClient();
//# sourceMappingURL=websocket-client.js.map