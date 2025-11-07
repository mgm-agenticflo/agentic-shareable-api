import { Middleware } from '../types/handler-types';
import { HttpError } from '../errors/http-error';
import { tokenService } from '../services/transient-token';
import { getHeader } from '../utils/lib';
import { RequestEvent } from '../types/request-types';
import { HttpStatusCode } from 'axios';

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
 * @throws {HttpError} 401 Unauthorized - If Authorization header is missing or invalid
 * @throws {HttpError} 401 Unauthorized - If Authorization format is not "Bearer <token>"
 * @throws {HttpError} 422 Unprocessable Entity - If token verification fails
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
export const jwtMiddleware: Middleware = async (event: RequestEvent, next) => {
  try {
    const headers = event.httpContext?.headers;
    if (!headers) {
      throw new HttpError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
    }

    const authHeader = getHeader(headers, 'Authorization');
    if (!authHeader) {
      throw new HttpError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
    }

    // Must be Bearer token format
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    if (!match) throw new HttpError(HttpStatusCode.Unauthorized, 'Invalid Authorization format');

    const token = match[1].trim();
    if (!token) {
      throw new HttpError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
    }

    const shareableContext = tokenService.verify(token);
    if (!shareableContext) {
      throw new HttpError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
    }

    // Add shareable context to request context for downstream handlers
    const enhancedEvent: RequestEvent = {
      ...event,
      shareableContext
    } as RequestEvent;

    return next(enhancedEvent);
  } catch (err) {
    // Re-throw HttpErrors as-is
    if (err instanceof HttpError) {
      throw err;
    }
    // Otherwise tell we have no idea
    throw new HttpError(HttpStatusCode.UnprocessableEntity, 'Can not evaluate authorization');
  }
};
