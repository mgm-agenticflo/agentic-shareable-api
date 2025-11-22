import { WebSocketServer } from 'ws';
import { connectionManager } from './services/connection-manager';
import { handleWebSocketMessage } from './websocket-router';
import { registerConnection, unregisterConnection } from './services/websocket-client';
import logger from './utils/logger';
import { randomUUID } from 'crypto';
const WS_PORT = Number(process.env.OFFLINE_WS_PORT || process.env.WS_PORT || '6001');
export function setupWebSocketServer() {
    const wss = new WebSocketServer({ port: WS_PORT, host: '0.0.0.0' });
    wss.on('connection', async (ws) => {
        const connectionId = randomUUID();
        try {
            await connectionManager.saveConnection(connectionId);
            registerConnection(connectionId, ws);
            logger.info(`WebSocket connection established: ${connectionId}`);
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await handleWebSocketMessage(connectionId, message, ws);
                }
                catch (error) {
                    logger.error(`Error handling WebSocket message from ${connectionId}:`, error);
                    ws.send(JSON.stringify({
                        success: false,
                        message: 'Invalid message format',
                        error: { message: 'Invalid JSON', code: 'INVALID_FORMAT' }
                    }));
                }
            });
            ws.on('close', async () => {
                try {
                    unregisterConnection(connectionId);
                    await connectionManager.deleteConnection(connectionId);
                    logger.info(`WebSocket connection closed: ${connectionId}`);
                }
                catch (error) {
                    logger.error(`Error cleaning up connection ${connectionId}:`, error);
                }
            });
            ws.on('error', (error) => {
                logger.error(`WebSocket error for connection ${connectionId}:`, error);
                unregisterConnection(connectionId);
            });
        }
        catch (error) {
            logger.error(`Error setting up WebSocket connection ${connectionId}:`, error);
            ws.close();
        }
    });
    wss.on('listening', () => {
        logger.info(`WebSocket server listening on port ${WS_PORT}`);
    });
    wss.on('error', (error) => {
        logger.error('WebSocket server error:', error);
    });
    return wss;
}
