import { APIGatewayProxyEventV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { ShareableContext } from './shareable-context';
export type TargetResource = {
    method: string;
    resource: string;
    action?: string;
};
export type RequestEvent<T = unknown> = {
    httpContext?: APIGatewayProxyEventV2;
    websocketContext?: APIGatewayProxyWebsocketEventV2;
    shareableContext?: ShareableContext;
    parsedBody: T;
    targetResource: TargetResource;
};
export type WithShareable<T = unknown> = RequestEvent<T> & {
    shareableContext: ShareableContext;
};
export type WithHttp<T = unknown> = RequestEvent<T> & {
    httpContext: APIGatewayProxyEventV2;
};
export type WithWebSocket<T = unknown> = RequestEvent<T> & {
    websocketContext: APIGatewayProxyWebsocketEventV2;
};
export type WebchatRequestPayload = {
    sessionId: string;
    [key: string]: unknown;
};
export type WebchatMessageRequest = WebchatRequestPayload & {
    message: string;
};
export type ResourceRequest = {
    token: string;
};
export type WebSocketMessage = {
    command: string;
    [key: string]: unknown;
};
//# sourceMappingURL=request-types.d.ts.map