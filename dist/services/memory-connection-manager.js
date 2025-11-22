import logger from '../utils/logger';
/**
 * Create an in-memory connection manager for offline/local development
 *
 * This factory function creates a connection manager that stores WebSocket connections
 * in memory using a Map. It includes automatic cleanup of expired connections via a
 * periodic interval timer. Ideal for local development and testing.
 *
 * @param connections - A Map to store connection records, keyed by connection ID
 * @returns An object with methods to manage WebSocket connections in memory
 */
export const CreateInMemoryConnectionManager = (connections) => {
    let cleanupIntervalId = null;
    const cleanupExpiredConnections = () => {
        const now = Math.floor(Date.now() / 1000);
        let cleanedCount = 0;
        for (const [connectionId, record] of connections.entries()) {
            if (record.ttl && record.ttl < now) {
                connections.delete(connectionId);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger.debug(`[OFFLINE MODE] Cleaned up ${cleanedCount} expired connections`);
        }
    };
    return {
        init: () => {
            if (cleanupIntervalId !== null) {
                logger.warn('[OFFLINE MODE] Connection manager already initialized');
                return;
            }
            logger.info('[OFFLINE MODE] Using in-memory connection manager');
            cleanupIntervalId = setInterval(cleanupExpiredConnections, 60000);
        },
        destroy: () => {
            if (cleanupIntervalId !== null) {
                clearInterval(cleanupIntervalId);
                cleanupIntervalId = null;
                logger.info('[OFFLINE MODE] Connection manager destroyed');
            }
        },
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
            connections.set(connectionId, record);
            logger.debug(`[OFFLINE MODE] Saved connection ${connectionId}. Total connections: ${connections.size}`);
            await Promise.resolve();
        },
        getConnection: async (connectionId) => {
            const record = connections.get(connectionId);
            if (!record) {
                return null;
            }
            // Check if connection has expired
            const now = Math.floor(Date.now() / 1000);
            if (record.ttl && record.ttl < now) {
                connections.delete(connectionId);
                logger.debug(`[OFFLINE MODE] Connection ${connectionId} expired and removed`);
                return null;
            }
            return Promise.resolve(record);
        },
        deleteConnection: async (connectionId) => {
            const deleted = connections.delete(connectionId);
            if (deleted) {
                logger.debug(`[OFFLINE MODE] Deleted connection ${connectionId}. Remaining: ${connections.size}`);
            }
            await Promise.resolve();
        },
        getConnectionsByChannel: async (channelId) => {
            const now = Math.floor(Date.now() / 1000);
            const results = [];
            for (const record of connections.values()) {
                // Skip expired connections
                if (record.ttl && record.ttl < now) {
                    continue;
                }
                // Check if this connection has the channel
                if (record.shareableContext?.channels?.includes(channelId)) {
                    results.push(record);
                }
            }
            logger.debug(`[OFFLINE MODE] Found ${results.length} connections for channel ${channelId}`);
            return Promise.resolve(results);
        },
        getConnectionsByResourceId: async (resourceType, resourceId) => {
            const now = Math.floor(Date.now() / 1000);
            const results = [];
            for (const record of connections.values()) {
                // Skip expired connections
                if (record.ttl && record.ttl < now) {
                    continue;
                }
                // Check if this connection matches the resource
                if (record.shareableContext?.type === resourceType && record.shareableContext?.id === resourceId) {
                    results.push(record);
                }
            }
            logger.debug(`[OFFLINE MODE] Found ${results.length} connections for ${resourceType}:${resourceId}`);
            return Promise.resolve(results);
        }
    };
};
