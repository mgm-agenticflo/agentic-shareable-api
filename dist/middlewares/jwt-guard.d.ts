import { Middleware } from '../types/handler-types';
/**
 * Middleware that validates JWT tokens from the Authorization header.
 *
 * This middleware:
 * 1. Extracts the JWT token from the Authorization header (must be in Bearer token format)
 * 2. Verifies the token using the token service
 * 3. Adds the decoded ShareableContext to the request event
 * 4. Passes the enhanced event to the next middleware/handler
 *
 * The Authorization header must follow the format: `Bearer <token>`
 *
 * @param event - The incoming request event containing HTTP context and headers
 * @param next - The next middleware or handler function in the chain
 * @returns Result from the next handler with the enhanced event containing shareableContext
 *
 * @throws {HttpCodedError} 401 Unauthorized - If Authorization header is missing or invalid
 * @throws {HttpCodedError} 401 Unauthorized - If Authorization format is not "Bearer <token>"
 * @throws {HttpCodedError} 422 Unprocessable Entity - If token verification fails
 *
 * @example
 * ```typescript
 * // Apply middleware to a route
 *
 * // After middleware, access the shareable context
 * const handler = async (event: RequestEvent) => {
 *   const context = event.shareableContext;
 *   console.log('Shareable Token:', context.token);
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Making a request with proper authorization
 * fetch('/api/endpoint', {
 *   headers: {
 *     'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *   }
 * });
 * ```
 */
export declare const jwtMiddleware: Middleware;
//# sourceMappingURL=jwt-guard.d.ts.map