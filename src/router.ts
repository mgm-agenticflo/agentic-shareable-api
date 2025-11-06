import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { HandlerFn, HandlerResponse, Middleware } from './types/handler-types';
import { ParsedRequestContext, RequestEvent } from './types/request-types';
import { parseRequest } from './utils/request';
import { respond } from './utils/response';
import { getErrorMessage } from './utils/lib';
import logger from './utils/logger';
import { HttpError } from './errors/http-error';
import { jwtMiddleware } from './middlewares/jwt-guard';
import { resourceModule } from './handlers/resource';
import { webchatModule } from './handlers/webchat';

/**
 * Composes a handler function with a chain of middleware functions.
 *
 * Creates a new handler that executes the provided middlewares in sequence,
 * with each middleware having the ability to:
 * - Process the request before the handler
 * - Short-circuit the chain by returning early
 * - Modify the request context passed to subsequent middlewares and handler
 * - Handle errors thrown by downstream middlewares or the handler
 *
 * @param handler - The original handler function to wrap with middleware
 * @param middlewares - Array of middleware functions to apply, executed in order
 * @returns A new handler function that executes the middleware chain followed by the original handler
 *
 * @example
 * ```typescript
 * // Apply authentication, logging, and validation middlewares
 * const enhancedHandler = applyMiddleware(originalHandler, [
 *   authMiddleware,
 *   loggingMiddleware,
 *   validationMiddleware
 * ]);
 *
 * // Use in router
 * const actionsMap = {
 *   myAction: applyMiddleware(myHandler, middlewares)
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Middleware execution order:
 * // 1. middleware1 pre-processing
 * // 2. middleware2 pre-processing
 * // 3. middleware3 pre-processing
 * // handler execution
 * ```
 */
const applyMiddleware = (handler: HandlerFn, middlewares: Middleware[]): HandlerFn => {
  return async (event: RequestEvent, context: ParsedRequestContext) => {
    const executeMiddleware = async (
      index: number,
      currentEvent: RequestEvent,
      currentContext: ParsedRequestContext
    ): Promise<HandlerResponse> => {
      if (index >= middlewares.length) {
        // All middlewares executed, call the actual handler
        return handler(currentEvent, currentContext);
      }
      const currentMiddleware = middlewares[index];
      return currentMiddleware(currentEvent, currentContext, (nextEvent, nextContext) =>
        executeMiddleware(index + 1, nextEvent, nextContext)
      );
    };
    return executeMiddleware(0, event, context);
  };
};

/**
 * Two-level routing: resource → action → handler
 *
 * Structure:
 * {
 *   resource: {
 *     action: handler
 *   }
 * }
 *
 * Special case: 'resource' is a reserved namespace for initial shareable validation
 * All other resources require JWT authentication
 */
const routingMap: Record<string, Record<string, HandlerFn>> = {
  // Special resource: initial shareable validation (no auth)
  resource: {
    get: resourceModule.get as HandlerFn
  },

  // Protected resources (require JWT)
  webchat: {
    send: applyMiddleware(webchatModule.send as HandlerFn, [jwtMiddleware]),
    'get-history': applyMiddleware(webchatModule.getHistory as HandlerFn, [jwtMiddleware])
  }
};

/**
 * Main Lambda entrypoint for both HTTP and WebSocket requests.
 *
 * Responsibilities:
 * 1. Parse the incoming event into a normalized `context` (via `parseEvent`).
 * 2. Match the `context.action` to a registered handler in `actionsMap`.
 * 3. Execute the matched handler and capture its result.
 * 4. Wrap the handler's output (or error) into a unified API Gateway response.
 *
 * - For HTTP events => returns a standard JSON response.
 * - For WebSocket events => posts the data back through the API Gateway Management API,
 *   then returns `{ statusCode: 200 }` to acknowledge the invocation.
 *
 * @param event  Incoming API Gateway event (HTTP or WebSocket)
 * @returns      Structured API Gateway response with appropriate status and body
 */
export const handler = async (event: RequestEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  let context: ParsedRequestContext | null = null;
  try {
    // Get context
    context = parseRequest(event);
    if (!context) {
      return respond(null, 400, { error: 'Invalid request' });
    }

    if (!context.resource) {
      return respond(context, 400, { error: 'Resource required' });
    }

    if (!context.action) {
      return respond(context, 400, { error: 'Action required' });
    }

    // Look up resource module
    const resourceHandlers = routingMap[context.resource];
    if (!resourceHandlers) {
      return respond(context, 404, {
        error: `Resource '${context.resource}' not found`
      });
    }

    // Look up action handler
    const handlerFn = resourceHandlers[context.action];
    if (!handlerFn) {
      return respond(context, 404, {
        error: `Action '${context.action}' not found in resource '${context.resource}'`
      });
    }

    // Execute handler
    const result = await handlerFn(event, context);

    // Respond
    return respond(context, 200, result);
  } catch (err: any) {
    const msg = getErrorMessage(err);
    const statusCode = err instanceof HttpError ? err.statusCode : 500;
    logger.error(msg, err, {
      statusCode,
      domainName: context?.domainName,
      action: context?.action,
      details: err.details
    });
    return respond(context, statusCode, { error: msg });
  }
};
