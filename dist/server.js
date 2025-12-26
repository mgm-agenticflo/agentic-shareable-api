import { createServer } from 'http';
import { createApp } from './app';
import { createWebSocketServer } from './routes/websocket-handler';
import logger from './utils/logger';
/**
 * Main server entry point
 * Initializes Express HTTP server and WebSocket server
 */
function startServer() {
    const httpPort = Number(process.env.HTTP_PORT || 3000);
    const wsPort = Number(process.env.WS_PORT || 3001);
    // Create Express app
    const app = createApp();
    // Create HTTP server
    const httpServer = createServer(app);
    // Start HTTP server
    httpServer.listen(httpPort, () => {
        logger.info(`HTTP server listening on port ${httpPort}`);
    });
    // Start WebSocket server
    const wss = createWebSocketServer(wsPort);
    // Graceful shutdown handler
    const shutdown = (signal) => {
        logger.info(`Received ${signal}, starting graceful shutdown...`);
        // Close HTTP server
        httpServer.close(() => {
            logger.info('HTTP server closed');
        });
        // Close WebSocket server
        wss.close(() => {
            logger.info('WebSocket server closed');
        });
        // Give connections time to close gracefully
        setTimeout(() => {
            logger.info('Graceful shutdown complete');
            process.exit(0);
        }, 5000);
    };
    // Handle shutdown signals
    process.on('SIGTERM', () => {
        shutdown('SIGTERM');
    });
    process.on('SIGINT', () => {
        shutdown('SIGINT');
    });
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception:', error);
        shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection', reason);
        shutdown('unhandledRejection');
    });
}
// Start the server
try {
    startServer();
}
catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
}
//# sourceMappingURL=server.js.map