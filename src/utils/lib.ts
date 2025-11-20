import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { RequestEvent } from '../types/request-types';

export function isTrue(mystery: string | undefined): boolean {
  if (!mystery) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(String(mystery).toLowerCase());
}

/**
 * Retrieves a header value from API Gateway event headers in a case-insensitive manner.
 *
 * Searches through the headers object and performs case-insensitive matching
 * against the provided header name. This is necessary because HTTP headers are
 * case-insensitive by specification, but JavaScript object keys are case-sensitive.
 *
 * @param headers - The headers object from an API Gateway event
 * @param name - Header name to search for (case-insensitive, e.g., 'Authorization', 'content-type')
 * @returns The header value if found, otherwise `undefined`
 *
 * @example
 * ```typescript
 * const headers = event.headers;
 * const contentType = getHeader(headers, 'Content-Type');
 * const auth = getHeader(headers, 'authorization'); // Works with any casing
 * const bearer = getHeader(headers, 'AUTHORIZATION'); // Also works
 * ```
 */
export function getHeader(headers: Record<string, string | undefined>, name: string): string | undefined {
  if (!headers) {
    return;
  }
  const h = headers;
  const target = name.toLowerCase();
  for (const k in h) {
    if (k.toLowerCase() === target) return h[k];
  }
  return undefined;
}

/**
 * Safely parses JSON from a request body, handling Base64 encoding and errors gracefully.
 *
 * Features:
 * - Decodes Base64-encoded bodies when `isBase64Encoded` is true
 * - Returns an empty object `{}` on parse errors, null, or undefined input
 * - Type-safe with generic return type for type inference
 * - Never throws errors - always returns a valid object
 *
 * @template T - The expected type of the parsed JSON (defaults to `Record<string, unknown>`)
 * @param body - Raw request body string (may be Base64 encoded)
 * @param isBase64Encoded - Whether the body is Base64 encoded (defaults to false)
 * @returns Parsed JSON object of type T, or empty object `{}` if parsing fails
 *
 * @example
 * ```typescript
 * // Parse a normal JSON body
 * const data = safeJson<UserPayload>(event.body);
 * // => { userId: '123', name: 'Alice' }
 *
 * // Parse a Base64-encoded body
 * const decoded = safeJson(event.body, event.isBase64Encoded);
 * // => { message: 'Hello' }
 *
 * // Handles invalid JSON gracefully
 * const empty = safeJson(null);
 * // => {}
 *
 * const alsoEmpty = safeJson('invalid json');
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
 * Safely extracts a human-readable error message from an unknown error value.
 *
 * Handles various error formats that may be thrown in JavaScript/TypeScript:
 * - `Error` instances (including subclasses): Returns the `message` property
 * - String values: Returns the string directly
 * - All other types: Returns a generic fallback message
 *
 * This function is particularly useful in catch blocks where the error type is
 * unknown, as TypeScript's catch clause variables are typed as `unknown`.
 *
 * @param err - The caught error (can be Error, string, or any other type)
 * @returns A safe, non-empty string message describing the error
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   const message = getErrorMessage(err);
 *   logger.error('Operation failed:', message);
 * }
 * ```
 *
 * @example
 * ```typescript
 * getErrorMessage(new Error('Database connection failed'));
 * // => 'Database connection failed'
 *
 * getErrorMessage('Something went wrong');
 * // => 'Something went wrong'
 *
 * getErrorMessage({ code: 500 });
 * // => 'Unexpected error occurred'
 * ```
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unexpected error occurred';
}

/**
 * Type guard that checks whether an unknown value is a non-null object
 * containing a specific property key.
 *
 * This function is useful for safely using the `in` operator or accessing
 * dynamic properties without triggering TypeScript or ESLint warnings about
 * unsafe member access on unknown types.
 *
 * After this check passes, TypeScript narrows the type to `Record<string, unknown>`,
 * allowing safe property access.
 *
 * @param mystery - The value to test (can be any type)
 * @param key - The property key to check for
 * @returns `true` if `mystery` is an object (not null) and has the specified key
 *
 * @example
 * ```typescript
 * function processPayload(payload: unknown) {
 *   if (hasKey(payload, 'id')) {
 *     console.log(payload.id); // TypeScript knows payload is Record<string, unknown>
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * hasKey({ id: 123, name: 'Alice' }, 'id');
 * // => true
 *
 * hasKey({ id: 123 }, 'email');
 * // => false
 *
 * hasKey(null, 'id');
 * // => false
 *
 * hasKey('string', 'length');
 * // => false (strings are not plain objects)
 * ```
 */
export function hasKey(mystery: unknown, key: string): mystery is Record<string, unknown> {
  return typeof mystery === 'object' && mystery !== null && key in mystery;
}

/**
 * Parses an AWS API Gateway V2 HTTP event into a structured request object.
 *
 * Extracts the HTTP method, resource, and action from the event's path and request context,
 * and safely parses the request body (handling base64 encoding if present).
 *
 * @param event - The API Gateway Proxy Event V2 object containing request details
 * @returns A RequestEvent object containing:
 *   - httpContext: The original event object
 *   - parsedBody: The safely parsed request body (JSON or null)
 *   - targetResource: Object with method, resource (first path segment), and action (second path segment)
 *
 * @example
 * // For a request to POST /users/create
 * const requestEvent = parseHttpEvent(event);
 * // Returns: { targetResource: { method: 'POST', resource: 'users', action: 'create' }, ... }
 */
export function parseHttpEvent(event: APIGatewayProxyEventV2): RequestEvent {
  const {
    http: { path, method }
  } = event.requestContext;

  // Strip base path if configured
  const basePath = process.env.HTTP_BASE_PATH || '';
  const normalizedPath = basePath ? path.replace(new RegExp(`^${basePath}`), '') : path;

  const pathParts = normalizedPath?.split('/').filter(Boolean) ?? [];
  const resource = pathParts[0] ?? undefined;
  const action = pathParts[1] ?? undefined;
  const targetResource = { method, resource, action };

  return {
    httpContext: event,
    parsedBody: safeJson(event.body, event.isBase64Encoded),
    targetResource
  };
}
