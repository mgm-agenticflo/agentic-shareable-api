import { WebSocket } from 'ws';
import { RequestEvent } from '../types/request-types';
import { ConnectionRecord } from '../types/websocket-types';
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
export declare function websocketToRequestEvent(ws: WebSocket, message: string | Buffer, connectionData: ConnectionRecord, connectionId: string): RequestEvent;
/**
 * Creates a mock WebSocket connect event for compatibility with existing handlers
 *
 * @param connectionId - Unique connection identifier
 * @returns Mock API Gateway WebSocket connect event
 */
export declare function createWebSocketConnectEvent(connectionId: string): {
    requestContext: {
        connectionId: string;
        routeKey: string;
        eventType: string;
        connectedAt: number;
        requestTime: number;
        requestTimeEpoch: number;
    };
    isBase64Encoded: boolean;
};
/**
 * Creates a mock WebSocket disconnect event for compatibility with existing handlers
 *
 * @param connectionId - Unique connection identifier
 * @returns Mock API Gateway WebSocket disconnect event
 */
export declare function createWebSocketDisconnectEvent(connectionId: string): {
    requestContext: {
        connectionId: string;
        routeKey: string;
        eventType: string;
        connectedAt: number;
        requestTime: number;
        requestTimeEpoch: number;
        disconnectStatusCode: number;
        disconnectReason: string;
    };
    isBase64Encoded: boolean;
};
//# sourceMappingURL=websocket-adapter.d.ts.map