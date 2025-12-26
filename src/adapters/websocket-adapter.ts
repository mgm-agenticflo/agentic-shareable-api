import { WebSocket } from 'ws';
import { RequestEvent, WebSocketMessage } from '../types/request-types';
import { ConnectionRecord } from '../types/websocket-types';
import { safeJson } from '../utils/lib';

/**
 * Converts a WebSocket message to a RequestEvent format
 * that is compatible with existing handlers.
 *
 * This adapter allows us to reuse all existing WebSocket handlers without modification
 * by converting WebSocket messages to the RequestEvent format used by Lambda handlers.
 *
 * @param ws - WebSocket connection instance
 * @param message - Raw message data (string or Buffer)
 * @param connectionData - Connection record from DynamoDB
 * @param connectionId - Unique connection identifier
 * @returns RequestEvent compatible with existing handlers
 */
export function websocketToRequestEvent(
  ws: WebSocket,
  message: string | Buffer,
  connectionData: ConnectionRecord,
  connectionId: string
): RequestEvent {
  const body = typeof message === 'string' ? message : message.toString('utf-8');
  const parsed = safeJson<WebSocketMessage>(body);
  const rawCommand = parsed.command || '';
  const [resource, action] = rawCommand.split(':');

  // Create a copy without the command field for parsedBody
  const { command, ...parsedBody } = parsed;
  void command;

  // Create a mock API Gateway WebSocket event structure for compatibility
  const mockEvent = {
    requestContext: {
      connectionId,
      routeKey: '$default',
      eventType: 'MESSAGE',
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      connectedAt: connectionData.connectedAt * 1000, // Convert to milliseconds
      requestTime: Date.now(),
      requestTimeEpoch: Date.now()
    },
    body,
    isBase64Encoded: false
  };

  return {
    websocketContext: mockEvent as unknown as RequestEvent['websocketContext'],
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
 * Creates a mock WebSocket connect event for compatibility with existing handlers
 *
 * @param connectionId - Unique connection identifier
 * @returns Mock API Gateway WebSocket connect event
 */
export function createWebSocketConnectEvent(connectionId: string) {
  const now = Math.floor(Date.now() / 1000);
  return {
    requestContext: {
      connectionId,
      routeKey: '$connect',
      eventType: 'CONNECT',
      connectedAt: now * 1000,
      requestTime: Date.now(),
      requestTimeEpoch: Date.now()
    },
    isBase64Encoded: false
  };
}

/**
 * Creates a mock WebSocket disconnect event for compatibility with existing handlers
 *
 * @param connectionId - Unique connection identifier
 * @returns Mock API Gateway WebSocket disconnect event
 */
export function createWebSocketDisconnectEvent(connectionId: string) {
  const now = Math.floor(Date.now() / 1000);
  return {
    requestContext: {
      connectionId,
      routeKey: '$disconnect',
      eventType: 'DISCONNECT',
      connectedAt: now * 1000,
      requestTime: Date.now(),
      requestTimeEpoch: Date.now(),
      disconnectStatusCode: 1000,
      disconnectReason: 'Client disconnect'
    },
    isBase64Encoded: false
  };
}
