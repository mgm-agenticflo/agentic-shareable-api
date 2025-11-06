import { APIGatewayProxyEventV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { ShareableContext } from './shareable-context';

export enum ContextTypes {
  Websocket = 'websocket',
  Http = 'http'
}

export type HttpProtocol = 'http' | 'https';
export type WsProtocol = 'ws' | 'wss';
export type Protocol = HttpProtocol | WsProtocol;

// Base context with all common fields
export interface ParsedRequestContext {
  type: ContextTypes;
  resource?: string;
  action?: string;
  protocol: Protocol;
  domainName: string;
  stage: string;
  body: Record<string, unknown>;
  shareableContext?: ShareableContext;

  // HTTP-specific fields (undefined for websocket)
  method?: string;
  pathParams?: Record<string, any>;
  queryParams?: Record<string, string | undefined>;

  // Websocket-specific fields (undefined for http)
  connectionId?: string;
}

export type RequestEvent = APIGatewayProxyEventV2 | APIGatewayProxyWebsocketEventV2;
