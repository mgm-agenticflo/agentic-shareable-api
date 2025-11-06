import { Middleware } from '../types/handler-types';
import { HttpError } from '../errors/http-error';
import { tokenService } from '../services/transient-token';
import { ParsedRequestContext } from '../types/request-types';

/**
 * JWT authentication middleware.
 *
 * Extracts and verifies JWT from Authorization header,
 * adds decoded payload to context.user
 *
 * @example
 * ```typescript
 * const actionsMap: Record<string, HandlerFn> = {
 *   getResource: applyMiddleware(resourceModule.get, [jwtMiddleware]),
 *   execute: applyMiddleware(actionModule.execute, [jwtMiddleware])
 * };
 * ```
 */
export const jwtMiddleware: Middleware = async (event, context, next) => {
  const headers = (event as any).headers;

  if (!headers) {
    throw new HttpError(401, 'Missing authorization token');
  }

  const authHeader = headers['Authorization'] || headers['authorization'];

  if (!authHeader) {
    throw new HttpError(401, 'Missing authorization token');
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    throw new HttpError(401, 'Invalid authorization header format');
  }

  try {
    const shareableContext = tokenService.verify(token);

    // Validate that the requested resource is in the allowed resources
    if (context.resource && shareableContext.channels && !shareableContext.channels.includes(context.resource)) {
      throw new HttpError(403, `Access denied to resource '${context.resource}'`);
    }

    // Add shareable context to request context
    const enhancedContext: ParsedRequestContext = {
      ...context,
      shareableContext
    } as ParsedRequestContext;

    return next(event, enhancedContext);
  } catch (err) {
    if (err instanceof HttpError) {
      throw err;
    }
    throw new HttpError(401, 'Invalid or expired token');
  }
};
