import logger from '../utils/logger';
let connectionMap = new Map();
export function registerConnection(connectionId, ws) {
    connectionMap.set(connectionId, ws);
    ws.on('close', () => {
        connectionMap.delete(connectionId);
    });
    ws.on('error', () => {
        connectionMap.delete(connectionId);
    });
}
export function unregisterConnection(connectionId) {
    connectionMap.delete(connectionId);
}
export function getConnection(connectionId) {
    return connectionMap.get(connectionId);
}
export const CreateNativeWebSocketClient = () => {
    return {
        sendToConnection: async (connectionId, command, data) => {
            try {
                const ws = connectionMap.get(connectionId);
                if (!ws || ws.readyState !== 1) {
                    logger.info(`Connection ${connectionId} is not available`);
                    return false;
                }
                ws.send(JSON.stringify({ command, ...data }));
                return true;
            }
            catch (error) {
                logger.error(`Failed to send message to ${connectionId}:`, error);
                connectionMap.delete(connectionId);
                return false;
            }
        },
        sendToConnections: async (connectionIds, command, data) => {
            const staleConnections = [];
            await Promise.all(connectionIds.map(async (connectionId) => {
                try {
                    const ws = connectionMap.get(connectionId);
                    if (!ws || ws.readyState !== 1) {
                        staleConnections.push(connectionId);
                        return;
                    }
                    ws.send(JSON.stringify({ command, ...data }));
                }
                catch (error) {
                    logger.error(`Failed to send message to ${connectionId}:`, error);
                    staleConnections.push(connectionId);
                    connectionMap.delete(connectionId);
                }
            }));
            return staleConnections;
        },
        broadcast: async (connectionIds, command, data) => {
            const staleConnections = [];
            await Promise.all(connectionIds.map(async (connectionId) => {
                try {
                    const ws = connectionMap.get(connectionId);
                    if (!ws || ws.readyState !== 1) {
                        staleConnections.push(connectionId);
                        return;
                    }
                    ws.send(JSON.stringify({ command, ...data }));
                }
                catch (error) {
                    logger.error(`Failed to send message to ${connectionId}:`, error);
                    staleConnections.push(connectionId);
                    connectionMap.delete(connectionId);
                }
            }));
            return {
                sent: connectionIds.length - staleConnections.length,
                stale: staleConnections
            };
        },
        disconnect: async (connectionId) => {
            try {
                const ws = connectionMap.get(connectionId);
                if (ws) {
                    ws.close();
                    connectionMap.delete(connectionId);
                }
            }
            catch (error) {
                logger.error(`Failed to disconnect ${connectionId}:`, error);
                connectionMap.delete(connectionId);
            }
        }
    };
};
export const websocketClient = CreateNativeWebSocketClient();
