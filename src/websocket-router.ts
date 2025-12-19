import type { APIGatewayProxyStructuredResultV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { HttpStatusCode } from 'axios';
import { HttpCodedError } from './errors/http-error';
import { handleConnect, handleDisconnect } from './handlers/websocket-connection';
import { requireAuthentication } from './middlewares/ws-auth';
import { connectionManager } from './services/connection-manager';
import { extractErrorData, notifySlackAsync } from './services/slack-notifier';
import { websocketClient } from './services/websocket-client';
import { HandlerFn } from './types/handler-types';
import { RequestEvent, WebSocketMessage } from './types/request-types';
import { ConnectionRecord } from './types/websocket-types';
import { getErrorMessage, safeJson } from './utils/lib';
import logger from './utils/logger';
import { failure, success, wsFailure, wsSuccess } from './utils/response';

import { authModule } from './handlers/auth';
import { resourceModule } from './handlers/resource';
import { uploadModule } from './handlers/upload';
import { webchatModule } from './handlers/webchat';

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
 * Parse WebSocket message and create RequestEvent
 * Converts: { command: "webchat:send", message: "Hello" }
 * Into: RequestEvent with targetResource: { method: "WS", resource: "webchat", action: "send" }
 */
function parseWebSocketMessage(event: APIGatewayProxyWebsocketEventV2, connectionData: ConnectionRecord): RequestEvent {
  const body = safeJson(event.body);
  const message = body as WebSocketMessage;

  // Parse command format: "resource:action"
  const rawCommand = message.command || '';
  const [resource, action] = rawCommand.split(':');

  // Create a copy without the command field for parsedBody
  const { command, ...parsedBody } = message;
  void command;

  return {
    websocketContext: event,
    shareableContext: connectionData.shareableContext,
    parsedBody,
    targetResource: {
      method: 'WS',
      resource,
      action
    }
  };
}

/**
 * Get WebSocket endpoint URL from event
 * In offline mode, always use localhost regardless of what the proxy reports
 */
function getWebSocketEndpoint(event: APIGatewayProxyWebsocketEventV2): string {
  // In offline mode, force localhost endpoint
  if (process.env.IS_OFFLINE === 'true') {
    const port = process.env.OFFLINE_WS_PORT || '6001';
    const endpoint = `http://localhost:${port}`;
    logger.debug(`[OFFLINE MODE] Using WebSocket endpoint: ${endpoint}`);
    return endpoint;
  }

  // In production, use the actual domain from the event
  const { domainName, stage } = event.requestContext;
  return `https://${domainName}/${stage}`;
}

/**
 * Handle WebSocket $default route (message handling)
 * This reuses existing HTTP handlers!
 */
async function handleMessage(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  const connectionId = event.requestContext.connectionId;
  const endpoint = getWebSocketEndpoint(event);

  try {
    // Retrieve connection data from DynamoDB
    const connection = await connectionManager.getConnection(connectionId);

    if (!connection) {
      logger.warn(`Message from unknown connection: ${connectionId}`);
      await websocketClient.sendToConnection(
        endpoint,
        connectionId,
        '',
        wsFailure('Connection not found', HttpStatusCode.NotFound)
      );
      return failure('Connection not found', HttpStatusCode.NotFound);
    }

    // Parse the message into RequestEvent format
    const requestEvent = parseWebSocketMessage(event, connection);

    const { resource, action } = requestEvent.targetResource;
    // Build command key - handle single-word commands (like "authenticate") without action
    const command = action ? `${resource}:${action}` : resource;

    // Look up handler in routing map
    const handler = messageRoutingMap[command];

    if (!handler) {
      logger.warn(`Unknown command: ${command}`);
      await websocketClient.sendToConnection(
        endpoint,
        connectionId,
        command,
        wsFailure(`Unknown command: ${command}`, HttpStatusCode.BadRequest)
      );
      return success(); // Return success to Lambda, error sent to client
    }

    // Check authentication for all commands except 'authenticate'
    if (command !== 'authenticate') {
      requireAuthentication(connection, command);
    }

    // Execute the handler
    const handlerResponse = await handler(requestEvent);

    // Send response back to the client
    // handlerResponse has shape { result, statusCode }, extract result for WebSocket response
    await websocketClient.sendToConnection(
      endpoint,
      connectionId,
      command,
      wsSuccess(handlerResponse.result, handlerResponse.statusCode)
    );
    return success();
  } catch (err: any) {
    const msg = getErrorMessage(err);
    logger.error(`Error handling WebSocket message ${msg}`, err);

    try {
      const connection = await connectionManager.getConnection(connectionId);
      if (connection) {
        const requestEvent = parseWebSocketMessage(event, connection);
        const errorData = extractErrorData(requestEvent, err);
        notifySlackAsync(errorData);
      } else {
        const errorData = extractErrorData(null, err, { connectionId });
        notifySlackAsync(errorData);
      }
    } catch (notificationError) {
      logger.error('Failed to extract error data for Slack notification', notificationError);
    }

    // Try to send error to client
    try {
      const body = safeJson(event.body);
      const command = (body as WebSocketMessage).command || 'unknown';

      if (err instanceof HttpCodedError) {
        await websocketClient.sendToConnection(endpoint, connectionId, command, wsFailure(err.message, err.statusCode));

        // Disconnect if the error requires it
        if (err.shouldClose) {
          await websocketClient.disconnect(endpoint, connectionId);
        }
      } else {
        await websocketClient.sendToConnection(
          endpoint,
          connectionId,
          command,
          wsFailure('Internal server error', HttpStatusCode.InternalServerError)
        );
      }
    } catch (sendError) {
      logger.error(`Failed to send error message to client:`, sendError);
    }

    return success(); // Always return success to Lambda
  }
}

/**
 * Main WebSocket Lambda handler
 * Routes to appropriate handler based on route key
 */
export const handler = async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  const routeKey = event.requestContext.routeKey;

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(event);

      case '$disconnect':
        return await handleDisconnect(event);

      case '$default':
        return await handleMessage(event);

      default:
        logger.warn(`Unknown route key: ${routeKey}`);
        return failure(`Unknown route: ${routeKey}`, HttpStatusCode.BadRequest);
    }
  } catch (err: any) {
    const msg = getErrorMessage(err);
    logger.error(`WebSocket handler error:`, err);

    const errorData = extractErrorData(
      {
        websocketContext: event,
        parsedBody: {},
        targetResource: { method: 'WS', resource: routeKey || 'unknown' }
      },
      err
    );
    notifySlackAsync(errorData);

    return failure(msg, HttpStatusCode.InternalServerError);
  }
};
