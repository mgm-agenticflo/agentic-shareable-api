import { APIGatewayProxyEventV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { ShareableContext } from './shareable-context';
import { TransientContext } from './transient-context';

export type TargetResource = {
  method: string;
  resource: string;
  action?: string;
};

export type RequestEvent = {
  httpContext?: APIGatewayProxyEventV2;
  websocketContext?: APIGatewayProxyWebsocketEventV2;
  shareableContext?: ShareableContext;
  transientContext?: TransientContext;
  parsedBody: unknown;
  targetResource: TargetResource;
};

export type WithShareable = RequestEvent & { shareableContext: ShareableContext };
export type WithHttp = RequestEvent & { httpContext: APIGatewayProxyEventV2 };

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
