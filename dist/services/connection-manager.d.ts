import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ConnectionRecord } from '../types/websocket-types';
import { ShareableContext } from '../types/shareable-context';
/**
 * Create a DynamoDB-backed connection manager for production use
 *
 * This factory function creates a connection manager that persists WebSocket connection
 * data in DynamoDB. Connections are stored with TTL for automatic cleanup after 24 hours.
 *
 * @param docClient - The DynamoDB Document Client instance for database operations
 * @returns An object with methods to manage WebSocket connections in DynamoDB
 */
export declare const CreateDynamoDBConnectionManager: (docClient: DynamoDBDocumentClient, TableName: string) => {
    /**
     * Initialize the connection manager
     * No-op for DynamoDB implementation as it requires no initialization
     */
    init: () => void;
    /**
     * Clean up resources when shutting down
     * No-op for DynamoDB implementation as it requires no cleanup
     */
    destroy: () => void;
    /**
     * Store a new connection in DynamoDB
     *
     * Creates a connection record with automatic TTL expiration after 24 hours.
     * The record includes connection metadata such as shareable context and session ID.
     *
     * @param connectionId - The unique WebSocket connection ID
     * @param shareableContext - Optional context containing resource type, ID, and channels
     * @param sessionId - Optional session identifier for tracking user sessions
     * @returns Promise that resolves when the connection is saved
     */
    saveConnection: (connectionId: string, shareableContext?: ShareableContext, sessionId?: string) => Promise<void>;
    /**
     * Retrieve connection data from DynamoDB
     *
     * Looks up a connection record by its unique connection ID.
     *
     * @param connectionId - The unique WebSocket connection ID to retrieve
     * @returns Promise that resolves to the connection record or null if not found
     */
    getConnection: (connectionId: string) => Promise<ConnectionRecord | null>;
    /**
     * Delete connection from DynamoDB
     *
     * Removes a connection record from the database, typically called when a WebSocket disconnects.
     *
     * @param connectionId - The unique WebSocket connection ID to delete
     * @returns Promise that resolves when the connection is deleted
     */
    deleteConnection: (connectionId: string) => Promise<void>;
    /**
     * Get all connections for a specific channel
     * Used for broadcasting messages to channel subscribers
     *
     * Scans the table for all connections that have subscribed to the specified channel.
     * Note: This uses a Scan operation which may be slower for large datasets.
     *
     * @param channelId - The channel ID to search for
     * @returns Promise that resolves to an array of connection records subscribed to the channel
     */
    getConnectionsByChannel: (channelId: string) => Promise<ConnectionRecord[]>;
    /**
     * Get all connections for a specific resource ID
     * Used for broadcasting to all users watching a resource
     *
     * Scans the table for all connections associated with a specific resource type and ID.
     * Note: This uses a Scan operation which may be slower for large datasets.
     *
     * @param resourceType - The type of resource (e.g., 'conversation', 'document')
     * @param resourceId - The unique identifier of the resource
     * @returns Promise that resolves to an array of connection records watching the resource
     */
    getConnectionsByResourceId: (resourceType: string, resourceId: string) => Promise<ConnectionRecord[]>;
};
export type ConnectionManager = ReturnType<typeof CreateDynamoDBConnectionManager>;
export declare const instance: {
    init: () => void;
    destroy: () => void;
    saveConnection: (connectionId: string, shareableContext?: ShareableContext, sessionId?: string) => Promise<void>;
    getConnection: (connectionId: string) => Promise<ConnectionRecord | null>;
    deleteConnection: (connectionId: string) => Promise<void>;
    getConnectionsByChannel: (channelId: string) => Promise<ConnectionRecord[]>;
    getConnectionsByResourceId: (resourceType: string, resourceId: string) => Promise<ConnectionRecord[]>;
};
export declare const connectionManager: {
    init: () => void;
    destroy: () => void;
    saveConnection: (connectionId: string, shareableContext?: ShareableContext, sessionId?: string) => Promise<void>;
    getConnection: (connectionId: string) => Promise<ConnectionRecord | null>;
    deleteConnection: (connectionId: string) => Promise<void>;
    getConnectionsByChannel: (channelId: string) => Promise<ConnectionRecord[]>;
    getConnectionsByResourceId: (resourceType: string, resourceId: string) => Promise<ConnectionRecord[]>;
};
//# sourceMappingURL=connection-manager.d.ts.map