import { APIGatewayProxyStructuredResultV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
/**
 * Handle WebSocket $connect event
 * Accepts all connections WITHOUT authentication
 *
 * Authentication is deferred to the first message the client sends.
 * This follows the proper WebSocket pattern where connection and authentication
 * are separate concerns, allowing clients to authenticate after connecting.
 */
export declare function handleConnect(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyStructuredResultV2>;
/**
 * Handle WebSocket $disconnect event
 * Removes the connection
 */
export declare function handleDisconnect(event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyStructuredResultV2>;
//# sourceMappingURL=websocket-connection.d.ts.map