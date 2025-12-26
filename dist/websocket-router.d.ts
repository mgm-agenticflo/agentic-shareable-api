import type { APIGatewayProxyStructuredResultV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
/**
 * Main WebSocket Lambda handler
 * Routes to appropriate handler based on route key
 */
export declare const handler: (event: APIGatewayProxyWebsocketEventV2) => Promise<APIGatewayProxyStructuredResultV2>;
//# sourceMappingURL=websocket-router.d.ts.map