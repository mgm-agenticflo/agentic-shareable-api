import { ParsedRequestContext, RequestEvent } from './request-types';

export type HttpResult = { statusCode?: number; body?: unknown };

export type HandlerFn = (event: RequestEvent, context: ParsedRequestContext) => Promise<HttpResult> | HttpResult;

// WebSocket doesn't need body in the response, but post to connection
export type WebSocketResult = {
  statusCode?: number;
};

export type HandlerResponse = HttpResult | WebSocketResult;

export type Middleware = (
  event: RequestEvent,
  context: ParsedRequestContext,
  next: HandlerFn
) => Promise<HandlerResponse>;
