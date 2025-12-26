import { WebSocket, WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';
import { connectionManager } from '../services/connection-manager';
import { websocketClientNative, registerConnection, unregisterConnection } from '../services/websocket-client-native';
import { websocketToRequestEvent } from '../adapters/websocket-adapter';
import { resourceModule } from '../handlers/resource';
import { webchatModule } from '../handlers/webchat';
import { uploadModule } from '../handlers/upload';
import { authModule } from '../handlers/auth';
import { requireAuthentication } from '../middlewares/ws-auth';
import { HttpCodedError } from '../errors/http-error';
import { HttpStatusCode } from 'axios';
import { getErrorMessage, safeJson } from '../utils/lib';
import { wsSuccess, wsFailure } from '../utils/response';
import { HandlerFn } from '../types/handler-types';
import { WebSocketMessage } from '../types/request-types';
import logger from '../utils/logger';

/**
 * Routing map for WebSocket messages
 * Reuses the exact same handlers as HTTP!
 * Format: { "resource:action": handler }
 */
const messageRoutingMap: Record<string, HandlerFn> = {
  // Authentication handler - must be called first after connection
  // Client sends: { command: "authenticate", token: "shareable-token" }
  authenticate: authModule.authenticate as HandlerFn,

  // Public resource handler (no auth needed, validated via shareable token)
  'resource:get': resourceModule.get as HandlerFn,

  // Protected handlers (auth required via authenticate command)
  // webchat handlers
  'webchat:get-history': webchatModule.getHistory as HandlerFn,
  'webchat:send': webchatModule.send as HandlerFn,

  // Upload handlers
  'upload:get-link': uploadModule.getUploadLink as HandlerFn,
  'upload:confirm': uploadModule.confirmUpload as HandlerFn
};

/**
 * Handle WebSocket message
 * This reuses existing HTTP handlers!
 */
async function handleMessage(ws: WebSocket, connectionId: string, message: string | Buffer): Promise<void> {
  const endpoint = 'ws://localhost'; // Not used in native implementation, kept for compatibility

  try {
    // Retrieve connection data from DynamoDB
    const connection = await connectionManager.getConnection(connectionId);

    if (!connection) {
      logger.warn(`Message from unknown connection: ${connectionId}`);
      await websocketClientNative.sendToConnection(
        endpoint,
        connectionId,
        '',
        wsFailure('Connection not found', HttpStatusCode.NotFound)
      );
      return;
    }

    // Parse the message into RequestEvent format
    const requestEvent = websocketToRequestEvent(ws, message, connection, connectionId);

    const { resource, action } = requestEvent.targetResource;
    // Build command key - handle single-word commands (like "authenticate") without action
    const command = action ? `${resource}:${action}` : resource;

    // Look up handler in routing map
    const handler = messageRoutingMap[command];

    if (!handler) {
      logger.warn(`Unknown command: ${command}`);
      await websocketClientNative.sendToConnection(
        endpoint,
        connectionId,
        command,
        wsFailure(`Unknown command: ${command}`, HttpStatusCode.BadRequest)
      );
      return;
    }

    // Check authentication for all commands except 'authenticate'
    if (command !== 'authenticate') {
      requireAuthentication(connection, command);
    }

    // Execute the handler
    const handlerResponse = await handler(requestEvent);

    // Send response back to the client
    // handlerResponse has shape { result, statusCode }, extract result for WebSocket response
    await websocketClientNative.sendToConnection(
      endpoint,
      connectionId,
      command,
      wsSuccess(handlerResponse.result, handlerResponse.statusCode)
    );
  } catch (err: any) {
    const msg = getErrorMessage(err);
    logger.error(`Error handling WebSocket message ${msg}`, err);

    // Try to send error to client
    try {
      const body = typeof message === 'string' ? message : message.toString('utf-8');
      const parsed = safeJson<WebSocketMessage>(body);
      const command = parsed.command || 'unknown';

      if (err instanceof HttpCodedError) {
        await websocketClientNative.sendToConnection(
          endpoint,
          connectionId,
          command,
          wsFailure(err.message, err.statusCode)
        );

        // Disconnect if the error requires it
        if (err.shouldClose) {
          await websocketClientNative.disconnect(endpoint, connectionId);
        }
      } else {
        await websocketClientNative.sendToConnection(
          endpoint,
          connectionId,
          command,
          wsFailure('Internal server error', HttpStatusCode.InternalServerError)
        );
      }
    } catch (sendError) {
      logger.error(`Failed to send error message to client:`, sendError);
    }
  }
}

/**
 * Create and configure WebSocket server
 *
 * @param port - Port number for WebSocket server
 * @returns Configured WebSocket server instance
 */
export function createWebSocketServer(port: number): WebSocketServer {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket) => {
    // Generate unique connection ID (replacing API Gateway connectionId)
    const connectionId = randomUUID();
    registerConnection(connectionId, ws);

    logger.info(`WebSocket connection established: ${connectionId}`);

    // Handle connect event (equivalent to $connect in API Gateway)
    // Store unauthenticated connection in DynamoDB
    // Client must authenticate via first message
    void connectionManager.saveConnection(connectionId).catch((error) => {
      logger.error(`Error in $connect handler:`, error);
      // Still accept the connection - client can try to authenticate
    });

    // Handle incoming messages
    ws.on('message', (message: string | Buffer) => {
      void handleMessage(ws, connectionId, message).catch((error) => {
        logger.error(`Error handling message:`, error);
      });
    });

    // Handle connection close
    ws.on('close', () => {
      logger.info(`WebSocket connection closed: ${connectionId}`);
      unregisterConnection(connectionId);

      // Handle disconnect event (equivalent to $disconnect in API Gateway)
      // Remove connection from DynamoDB
      void connectionManager.deleteConnection(connectionId).catch((error) => {
        logger.error(`Error in $disconnect handler:`, error);
      });
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error(`WebSocket error for connection ${connectionId}:`, error);
    });
  });

  logger.info(`WebSocket server listening on port ${port}`);

  return wss;
}
