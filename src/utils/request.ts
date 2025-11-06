import { ParsedRequestContext, ContextTypes, WsProtocol, RequestEvent, HttpProtocol } from '../types/request-types';
import { detectProtocol, isHttpEvent, isWebsocketEvent, parseBody, parsePathParameters } from './lib';

/**
 * Parses an API Gateway or WebSocket event into a standardized request context.
 *
 * Extracts and normalizes event data into a unified context structure that works
 * for both HTTP and WebSocket requests. Handles differences between API Gateway
 * V1, V2, and WebSocket event formats.
 *
 * Detection logic:
 * - **WebSocket**: Identified by presence of `connectionId` in request context
 * - **HTTP**: All other events are treated as HTTP requests
 *
 * @param event - The raw API Gateway or WebSocket request event
 * @returns Parsed context with type, protocol, action, and other metadata, or `null` if invalid
 *
 * @example
 * ```typescript
 * const context = parseRequest(event);
 * if (!context) {
 *   return { statusCode: 400, body: 'Invalid request' };
 * }
 *
 * if (context.type === ContextTypes.Websocket) {
 *   // Handle WebSocket
 * } else {
 *   // Handle HTTP
 * }
 * ```
 */
export function parseRequest(event: RequestEvent): ParsedRequestContext | null {
  const rc = event.requestContext;
  if (!rc || Object.keys(rc).length === 0) return null;

  const body = parseBody(event);
  const protocol = detectProtocol(event);
  const domainName = rc.domainName as string | undefined;
  const stage = rc.stage as string | undefined;

  // Base context shared by both types
  const baseContext = {
    protocol,
    domainName: domainName ?? '',
    stage: stage ?? '',
    body
  };

  // WebSocket
  if (isWebsocketEvent(event)) {
    if (!domainName || !stage) return null;

    return {
      ...baseContext,
      type: ContextTypes.Websocket,
      protocol: protocol as WsProtocol,
      resource: (body.resource as string | undefined) ?? undefined,
      action: (body.action as string | undefined) ?? undefined,
      connectionId: event.requestContext.connectionId,
      domainName,
      stage
    };
  }

  // HTTP
  const httpContext = isHttpEvent(event) ? event.requestContext.http : undefined;
  const httpMethod = 'httpMethod' in event ? (event.httpMethod as string | undefined) : undefined;
  const method = httpContext?.method ?? httpMethod;

  const { resource, action, pathParams } = parsePathParameters(event.pathParameters ?? {});
  const rawParams = event.pathParameters ?? {};

  let resolvedResource = resource;
  let resolvedAction = action;

  // Detect the special template: /resource/{token}
  const routeKey: string | undefined = event.requestContext.routeKey;
  const hasTokenParam = typeof rawParams.token === 'string';
  const isResourceTokenRoute = routeKey?.includes('/resource/{token}');
  if (!resolvedResource && hasTokenParam && isResourceTokenRoute) {
    resolvedResource = 'resource';
  }

  // If no action came from {action+}, use the HTTP verb as the action
  if (!resolvedAction && method) {
    resolvedAction = method.toLowerCase();
  }

  return {
    ...baseContext,
    type: ContextTypes.Http,
    protocol: protocol as HttpProtocol,
    resource: resolvedResource,
    action: resolvedAction,
    method,
    pathParams,
    queryParams: event.queryStringParameters || {}
  };
}
