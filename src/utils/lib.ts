import { APIGatewayProxyEventV2, APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { ContextTypes, HttpProtocol, ParsedRequestContext, Protocol, RequestEvent } from '../types/request-types';

/**
 * Type guard to check if a parsed request context is a WebSocket connection.
 *
 * Determines whether the incoming request is from a WebSocket connection
 * by checking the context type property.
 *
 * @param ctx - Parsed request context to check
 * @returns `true` if the context represents a WebSocket connection, otherwise `false`
 *
 * @example
 * ```typescript
 * if (isWebsocket(context)) {
 *   // Handle WebSocket-specific logic
 *   await sendWebSocketMessage(context.connectionId, data);
 * } else {
 *   // Handle HTTP logic
 *   return { statusCode: 200, body: JSON.stringify(data) };
 * }
 * ```
 */
export const isWebsocket = (ctx: ParsedRequestContext | undefined): boolean => ctx?.type === ContextTypes.Websocket;

/**
 * Constructs the API Gateway Management API endpoint URL for WebSocket connections.
 *
 * Builds the endpoint URL needed to send messages back to WebSocket clients
 * using the `@aws-sdk/client-apigatewaymanagementapi` client.
 *
 * Format: `https://{domainName}/{stage}` or `http://...` for offline mode
 *
 * @param ctx - Parsed WebSocket request context containing domain and stage info
 * @returns Full endpoint URL for the API Gateway Management API
 *
 * @example
 * ```typescript
 * const endpoint = getWebsocketEndpoint(context);
 * // => 'https://abc123.execute-api.us-east-1.amazonaws.com/prod'
 * // => 'http://localhost:3001/dev' (offline)
 * ```
 */
export function getWebsocketEndpoint(ctx: ParsedRequestContext): string {
  const { protocol, domainName, stage } = ctx;
  const scheme = getHttpScheme(protocol);
  return `${scheme}://${domainName}/${stage}`;
}

/**
 * Retrieves a header value from an API Gateway event in a case-insensitive manner.
 *
 * Searches through the event's headers object and performs case-insensitive
 * matching against the provided header name. Returns `undefined` if the
 * header is not found or if the event has no headers.
 *
 * @param event - The API Gateway or WebSocket request event
 * @param name - Header name to search for (case-insensitive)
 * @returns The header value if found, otherwise `undefined`
 *
 * @example
 * ```typescript
 * const contentType = getHeader(event, 'Content-Type');
 * const auth = getHeader(event, 'authorization');
 * // Works regardless of header name casing
 * ```
 */
export function getHeader(event: RequestEvent, name: string): string | undefined {
  if ('headers' in event && event.headers) {
    const h = (event.headers ?? {}) as Record<string, string | undefined>;
    const target = name.toLowerCase();
    for (const k in h) {
      if (k.toLowerCase() === target) return h[k];
    }
  }
  return undefined;
}

/**
 * Safely parses JSON from a request body, handling Base64 encoding and errors gracefully.
 *
 * Features:
 * - Decodes Base64-encoded bodies when `isBase64Encoded` is true
 * - Returns an empty object on parse errors or null/undefined input
 * - Type-safe with generic return type
 *
 * @param body - Raw request body (may be Base64 encoded)
 * @param isBase64Encoded - Whether the body is Base64 encoded (default: false)
 * @returns Parsed JSON object, or empty object if parsing fails
 *
 * @example
 * ```typescript
 * const data = safeJson<UserPayload>(event.body, event.isBase64Encoded);
 * // => { userId: '123', name: 'Alice' }
 *
 * const empty = safeJson(null);
 * // => {}
 * ```
 */
export function safeJson<T = Record<string, unknown>>(body: string | null | undefined, isBase64Encoded?: boolean): T {
  if (!body) return {} as T;
  const str = isBase64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
  try {
    return JSON.parse(str) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Extracts and parses the request body from an API Gateway or WebSocket event.
 *
 * Handles both plain and Base64-encoded payloads, automatically decoding
 * and parsing JSON content. Returns an empty object if the body is missing
 * or invalid.
 *
 * @param e - The API Gateway or WebSocket request event
 * @returns Parsed body as a key-value object, or empty object if parsing fails
 *
 * @example
 * ```typescript
 * const body = parseBody(event);
 * // => { userId: '123', action: 'create' }
 * ```
 */
export function parseBody(e: RequestEvent): Record<string, unknown> {
  const rawBody = 'body' in e ? e.body : null;
  const isB64 = 'isBase64Encoded' in e ? Boolean(e.isBase64Encoded) : false;
  return safeJson<Record<string, unknown>>(rawBody, isB64);
}

/**
 * Detects the protocol (http/https/ws/wss) for the incoming request.
 *
 * Protocol detection logic:
 * 1. Checks `x-forwarded-proto` header first (set by API Gateway/ALB)
 * 2. Falls back to inferring from event type and environment:
 *    - WebSocket events: `ws` (offline) or `wss` (deployed)
 *    - HTTP events: `http` (offline) or `http` (deployed)
 *
 * @param event - The API Gateway or WebSocket request event
 * @returns The detected protocol: 'http', 'https', 'ws', or 'wss'
 *
 * @example
 * ```typescript
 * const protocol = detectProtocol(event);
 * // => 'wss' (for deployed WebSocket)
 * // => 'ws' (for local WebSocket)
 * // => 'http' (for HTTP request)
 * ```
 */
export function detectProtocol(event: RequestEvent): Protocol {
  const xfProto = getHeader(event, 'x-forwarded-proto');
  if (xfProto) {
    const v = String(xfProto).toLowerCase();
    if (v === 'http' || v === 'https' || v === 'ws' || v === 'wss') return v;
  }
  const offline = process.env.IS_OFFLINE === 'true';
  if (isWebsocketEvent(event)) {
    return offline ? 'ws' : 'wss';
  }
  return offline ? 'http' : 'http';
}

/**
 * Parses API Gateway path parameters based on the route pattern `/{resource}/{action+}`.
 *
 * Extracts the resource and action from path parameters, where action+ is a greedy
 * path parameter that can contain multiple segments separated by forward slashes.
 * Additional path segments beyond the first action are captured in `additionalParams`.
 *
 * @param pathParameters - Path parameters from API Gateway event
 * @returns Object containing resource, action, and enriched pathParams with additionalParams array
 *
 * @example
 * // Route: /users/profile/settings/email
 * // Returns: { resource: 'users', action: 'profile', pathParams: { resource: 'users', 'action+': 'profile/settings/email', additionalParams: ['settings', 'email'] } }
 */
export function parsePathParameters(pathParameters: Record<string, any> = {}) {
  const resource = pathParameters.resource;
  const actionPath = pathParameters['action+'] || pathParameters.action || '';
  const actionParts = actionPath.split('/').filter(Boolean);
  const action = actionParts[0];
  const additionalParams = actionParts.slice(1);

  return { resource, action, pathParams: { ...pathParameters, additionalParams } };
}

/**
 * Safely extracts a human-readable error message from an unknown error value.
 *
 * Handles various error formats that may be thrown in JavaScript/TypeScript:
 * - `Error` instances: Returns the `message` property
 * - String values: Returns the string directly
 * - Other types: Returns a generic fallback message
 *
 * Useful in catch blocks where the error type is unknown.
 *
 * @param err - The caught error (can be Error, string, or any other type)
 * @returns A safe, non-empty string message
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   const message = getErrorMessage(err);
 *   logger.error('Operation failed', message);
 * }
 * ```
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unexpected error occurred';
}

/**
 * Type guard that checks whether an unknown value is a non-null object
 * containing a given property key.
 *
 * Useful for safely using the `'in'` operator or accessing dynamic keys
 * without triggering TypeScript or ESLint "unsafe access" warnings.
 *
 * @param mystery - The value to test.
 * @param key - The property key to check for.
 * @returns True if `mystery` is an object (not null) and has the specified key.
 *
 * @example
 * if (hasKey(payload, 'id')) {
 *   console.log(payload.id); // Safe access, payload is now narrowed
 * }
 */
export function hasKey(mystery: unknown, key: string): mystery is Record<string, unknown> {
  return typeof mystery === 'object' && mystery !== null && key in mystery;
}

/**
 * Type guard that determines whether the given event is a WebSocket event.
 *
 * Checks for the presence of the `connectionId` property in the event's `requestContext`,
 * which is the definitive indicator of an API Gateway WebSocket event.
 *
 * @param event - The API Gateway event to inspect
 * @returns True if the event is a WebSocket event (APIGatewayProxyWebsocketEventV2)
 *
 * @example
 * if (isWebsocketEvent(event)) {
 *   console.log(event.requestContext.connectionId);
 * }
 */
export function isWebsocketEvent(event: RequestEvent): event is APIGatewayProxyWebsocketEventV2 {
  return 'requestContext' in event && 'connectionId' in event.requestContext;
}

/**
 * Type guard that determines whether the given event is an HTTP event.
 *
 * Identifies API Gateway HTTP events (v2) by checking for the `http` property
 * in the event's `requestContext`, which contains HTTP-specific metadata like
 * method, path, protocol, and source IP.
 *
 * @param event - The API Gateway event to inspect
 * @returns True if the event is an HTTP event (APIGatewayProxyEventV2)
 *
 * @example
 * if (isHttpEvent(event)) {
 *   console.log(event.requestContext.http.method);
 * }
 */
export function isHttpEvent(event: RequestEvent): event is APIGatewayProxyEventV2 {
  return 'requestContext' in event && 'http' in event.requestContext;
}

/**
 * Type guard that determines whether a parsed request context
 * represents a WebSocket connection.
 *
 * @param event - The parsed request context to evaluate.
 * @returns True if the context represents a WebSocket request; otherwise false.
 */
export function isWebsocketContext(ctx: ParsedRequestContext): ctx is ParsedRequestContext & { connectionId: string } {
  return ctx.type === ContextTypes.Websocket;
}

/**
 * Type guard that determines whether a parsed request context
 * represents an HTTP connection.
 *
 * @param event - The parsed request context to evaluate.
 * @returns True if the context represents an HTTP request; otherwise false.
 */
export function isHttpContext(ctx: ParsedRequestContext): ctx is ParsedRequestContext & { method: string } {
  return ctx.type === ContextTypes.Http;
}

/**
 * Converts a low-level WebSocket protocol value to its equivalent HTTP scheme.
 *
 * For WebSocket protocols (`ws`, `wss`), this returns the corresponding
 * HTTP schemes (`http`, `https`). Any other protocol value is returned unchanged.
 *
 * @param protocol - The protocol string to convert (e.g., `ws`, `wss`, `http`, `https`).
 * @returns The corresponding HTTP scheme (`http` or `https`) or the input protocol itself.
 *
 * @example
 * getHttpScheme('wss'); // 'https'
 * getHttpScheme('ws');  // 'http'
 * getHttpScheme('https'); // 'https'
 */
export function getHttpScheme(protocol: Protocol): HttpProtocol {
  const scheme = protocol === 'wss' ? 'https' : protocol === 'ws' ? 'http' : protocol;
  return scheme;
}
