import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { getWebsocketEndpoint, isWebsocket } from './lib';
import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ParsedRequestContext } from '../types/request-types';

/**
 * Creates a successful API Gateway response with standardized JSON structure.
 *
 * @param result - The data to return in the response body
 * @param statusCode - HTTP status code (default: 200)
 * @returns API Gateway structured response with success flag and result data
 *
 * @example
 * ```typescript
 * return success({ userId: 123, name: 'Alice' }, 200);
 * // => { statusCode: 200, body: '{"success":true,"result":{...}}', headers: {...} }
 * ```
 */
export const success = (result: unknown, statusCode = 200): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  body: JSON.stringify({ success: true, result }),
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Creates an error API Gateway response with standardized JSON structure.
 *
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code (default: 500)
 * @param code - Optional error code for programmatic handling (e.g., 'INVALID_INPUT')
 * @returns API Gateway structured response with success flag and error details
 *
 * @example
 * ```typescript
 * return failure('User not found', 404, 'USER_NOT_FOUND');
 * // => { statusCode: 404, body: '{"success":false,"error":{...}}', headers: {...} }
 * ```
 */
export const failure = (message: string, statusCode = 500, code?: string): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  body: JSON.stringify({
    success: false,
    error: { message, code }
  }),
  headers: { 'Content-Type': 'application/json' }
});

/**
 * Extracts error details from a result payload.
 *
 * Handles various error formats:
 * - String errors: `"Something went wrong"`
 * - Object with error property: `{ error: "Something went wrong" }`
 * - Object with message/code: `{ error: { message: "...", code: "..." } }`
 *
 * @param result - The result payload that may contain error information
 * @returns Normalized error object with message and optional code
 *
 * @example
 * ```typescript
 * parseError({ error: { message: 'Invalid token', code: 'AUTH_FAILED' } });
 * // => { message: 'Invalid token', code: 'AUTH_FAILED' }
 * ```
 */
function parseError(result: unknown): { message: string; code?: string } {
  const errorData = result && typeof result === 'object' && 'error' in result ? result.error : result;

  const message =
    typeof errorData === 'string'
      ? errorData
      : errorData && typeof errorData === 'object' && 'message' in errorData
        ? String(errorData.message)
        : 'An error occurred';

  const code = errorData && typeof errorData === 'object' && 'code' in errorData ? String(errorData.code) : undefined;

  return { message, code };
}

/**
 * Formats a response payload for WebSocket or HTTP based on status code.
 *
 * Status codes >= 400 are treated as errors and formatted with error structure.
 * Status codes < 400 are treated as success and formatted with result structure.
 *
 * @param statusCode - HTTP-like status code
 * @param result - The data or error to include in the payload
 * @returns Formatted payload object with success flag and appropriate data structure
 *
 * @example
 * ```typescript
 * formatWebsocketPayload(200, { userId: 123 });
 * // => { success: true, result: { userId: 123 }, statusCode: 200 }
 *
 * formatWebsocketPayload(404, { error: 'Not found' });
 * // => { success: false, error: { message: 'Not found', statusCode: 404 } }
 * ```
 */
function formatWebsocketPayload(statusCode: number, result: unknown) {
  const isError = statusCode >= 400;

  if (isError) {
    const { message, code } = parseError(result);
    return { success: false, error: { message, code, statusCode } };
  }

  return { success: true, result: result ?? {}, statusCode };
}

/**
 * Sends a unified response for both HTTP and WebSocket Lambda invocations.
 *
 * **WebSocket behavior:**
 * - Uses API Gateway Management API to post a JSON payload to the connected client
 * - Payload includes `success` flag, data/error, and statusCode
 * - Returns `{ statusCode: 200 }` acknowledgment to Lambda
 *
 * **HTTP behavior:**
 * - Returns standard API Gateway structured JSON response
 * - Status codes >= 400 use error format, < 400 use success format
 *
 * @param context - Parsed request context (includes connection type, IDs, domain, etc.)
 * @param statusCode - HTTP-like status code to indicate success/failure
 * @param result - Optional payload data or error information
 * @returns API Gateway-compatible structured response
 *
 * @throws Will return a 400 failure response if context is invalid
 *
 * @example
 * ```typescript
 * // Success response
 * await respond(context, 200, { data: 'Hello' });
 *
 * // Error response
 * await respond(context, 404, { error: 'Resource not found' });
 * ```
 */
export async function respond(
  context: ParsedRequestContext | null,
  statusCode: number,
  result?: unknown
): Promise<APIGatewayProxyStructuredResultV2> {
  if (!context) {
    return failure('Invalid context', 400, 'INVALID_CONTEXT');
  }

  // WebSocket: push message via Management API
  if (isWebsocket(context)) {
    const client = new ApiGatewayManagementApiClient({ endpoint: getWebsocketEndpoint(context) });
    const payload = formatWebsocketPayload(statusCode, result);

    await client.send(
      new PostToConnectionCommand({
        ConnectionId: context.connectionId,
        Data: Buffer.from(JSON.stringify(payload))
      })
    );

    return { statusCode: 200 };
  }

  // HTTP: success or failure based on status code
  if (statusCode >= 400) {
    const { message, code } = parseError(result);
    return failure(message, statusCode, code);
  }

  return success(result ?? {}, statusCode);
}
