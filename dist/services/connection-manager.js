import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { CreateInMemoryConnectionManager } from './memory-connection-manager';
import { isTrue } from '../utils/lib';
/**
 * Create a DynamoDB-backed connection manager for production use
 *
 * This factory function creates a connection manager that persists WebSocket connection
 * data in DynamoDB. Connections are stored with TTL for automatic cleanup after 24 hours.
 *
 * @param docClient - The DynamoDB Document Client instance for database operations
 * @returns An object with methods to manage WebSocket connections in DynamoDB
 */
export const CreateDynamoDBConnectionManager = (docClient, TableName) => ({
    /**
     * Initialize the connection manager
     * No-op for DynamoDB implementation as it requires no initialization
     */
    init: () => { },
    /**
     * Clean up resources when shutting down
     * No-op for DynamoDB implementation as it requires no cleanup
     */
    destroy: () => { },
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
    saveConnection: async (connectionId, shareableContext, sessionId) => {
        const now = Math.floor(Date.now() / 1000);
        const ttl = now + Number(process.env.WS_CONNECTIONS_TTL || '24') * 60 * 60;
        const record = {
            connectionId,
            authenticated: !!shareableContext, // Authenticated only if context provided
            shareableContext,
            sessionId,
            connectedAt: now,
            ttl
        };
        await docClient.send(new PutCommand({
            TableName,
            Item: record
        }));
    },
    /**
     * Retrieve connection data from DynamoDB
     *
     * Looks up a connection record by its unique connection ID.
     *
     * @param connectionId - The unique WebSocket connection ID to retrieve
     * @returns Promise that resolves to the connection record or null if not found
     */
    getConnection: async (connectionId) => {
        const result = await docClient.send(new GetCommand({
            TableName,
            Key: { connectionId }
        }));
        return result.Item || null;
    },
    /**
     * Delete connection from DynamoDB
     *
     * Removes a connection record from the database, typically called when a WebSocket disconnects.
     *
     * @param connectionId - The unique WebSocket connection ID to delete
     * @returns Promise that resolves when the connection is deleted
     */
    deleteConnection: async (connectionId) => {
        await docClient.send(new DeleteCommand({
            TableName,
            Key: { connectionId }
        }));
    },
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
    getConnectionsByChannel: async (channelId) => {
        const result = await docClient.send(new ScanCommand({
            TableName,
            FilterExpression: 'contains(shareableContext.channels, :channelId)',
            ExpressionAttributeValues: {
                ':channelId': channelId
            }
        }));
        return result.Items || [];
    },
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
    getConnectionsByResourceId: async (resourceType, resourceId) => {
        const result = await docClient.send(new ScanCommand({
            TableName,
            FilterExpression: 'shareableContext.#type = :type AND shareableContext.id = :id',
            ExpressionAttributeNames: {
                '#type': 'type'
            },
            ExpressionAttributeValues: {
                ':type': resourceType,
                ':id': resourceId
            }
        }));
        return result.Items || [];
    }
});
const client = new DynamoDBClient({});
const TableName = process.env.WS_CONNECTIONS_TABLE || 'shareable-api-connections';
export const instance = isTrue(process.env.IS_OFFLINE)
    ? CreateInMemoryConnectionManager(new Map())
    : CreateDynamoDBConnectionManager(DynamoDBDocumentClient.from(client), TableName);
instance.init();
export const connectionManager = instance;
