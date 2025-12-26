import { getErrorMessage, parseHttpEvent } from './utils/lib';
import logger from './utils/logger';
import { HttpCodedError } from './errors/http-error';
import { jwtMiddleware } from './middlewares/jwt-guard';
import { resourceModule } from './handlers/resource';
import { webchatModule } from './handlers/webchat';
import { HttpStatusCode } from 'axios';
import { uploadModule } from './handlers/upload';
import { failure, success } from './utils/response';
/**
 * Composes a handler function with a chain of middleware functions.
 *
 * Creates a new handler that executes the provided middlewares in sequence,
 * with each middleware having the ability to:
 * - Enrich the event object with additional context, parsed data, or connections
 * - Short-circuit the pipeline by returning early (e.g., for authentication failures)
 * - Pass control to the next middleware via the `next()` function
 * - Handle errors and cleanup operations (e.g., closing database connections)
 *
 * Middlewares are executed in the order they appear in the array. Each middleware
 * must call `next(event)` to continue the chain, or return a response to short-circuit.
 *
 * @param handler - The final handler function to execute after all middlewares
 * @param middlewares - Array of middleware functions to execute in order
 * @returns A new handler function with the middleware pipeline applied
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
 * // Use in routing map
 * const routingMap = {
 *   myResource: {
 *     post: applyMiddleware(myHandler, [jwtMiddleware])
 *   }
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Example middleware that enriches the event
 * const authMiddleware: Middleware = async (event, next) => {
 *   const user = await authenticateUser(event.httpContext.headers.authorization);
 *   return next({ ...event, user }); // Pass enriched event to next middleware
 * };
 * ```
 */
const applyMiddleware = (handler, middlewares) => {
    return async (event) => {
        const enrichedEvent = event;
        const executeMiddleware = async (index, currentEvent) => {
            if (index >= middlewares.length) {
                // All middlewares executed, call the actual handler
                return handler(currentEvent);
            }
            const currentMiddleware = middlewares[index];
            // Pass next function that accepts enriched event
            return currentMiddleware(currentEvent, (nextEvent) => executeMiddleware(index + 1, nextEvent));
        };
        return executeMiddleware(0, enrichedEvent);
    };
};
/**
 * Application routing configuration mapping resources and HTTP methods to handlers.
 *
 * Structure: `{ resource: { method: handler } }`
 *
 * Routes are organized by resource path (extracted from `event.requestContext.http.path`)
 * and HTTP method (extracted from `event.requestContext.http.method`).
 *
 * - **Public routes**: No middleware, directly accessible
 * - **Protected routes**: Wrapped with `jwtMiddleware` for authentication
 *
 * @example
 * ```typescript
 * // Request to GET /resource -> resourceModule.get (no auth required)
 * // Request to POST /webchat -> webchatModule.send (JWT auth required)
 * ```
 */
const routingMap = {
    // Public resource: shareable token validation (no authentication required)
    resource: {
        'POST:get': resourceModule.get
    },
    // Protected resources (require JWT authentication)
    webchat: {
        'POST:get-history': applyMiddleware(webchatModule.getHistory, [jwtMiddleware]),
        'POST:send': applyMiddleware(webchatModule.send, [jwtMiddleware])
    },
    upload: {
        'POST:get-link': applyMiddleware(uploadModule.getUploadLink, [jwtMiddleware]),
        'POST:confirm': applyMiddleware(uploadModule.confirmUpload, [jwtMiddleware])
    }
};
/**
 * Main AWS Lambda handler for processing HTTP API Gateway requests.
 *
 * This handler implements a resource-based routing system that:
 * 1. Parses the incoming API Gateway event into a normalized `RequestEvent`
 * 2. Extracts the resource path and HTTP method from the request context
 * 3. Looks up the appropriate handler in the routing map
 * 4. Executes the handler (with any configured middleware)
 * 5. Returns a standardized API Gateway response
 *
 * The handler automatically catches and formats errors, including:
 * - Route not found errors (404)
 * - Method not allowed errors (400)
 * - Handler execution errors (mapped to appropriate HTTP status codes)
 * - Unexpected errors (500 Internal Server Error)
 *
 * @param event - API Gateway HTTP event (v2 payload format)
 * @returns Structured API Gateway response with statusCode, headers, and body
 *
 * @example
 * ```typescript
 * // Example API Gateway event structure:
 * {
 *   requestContext: {
 *     http: {
 *       path: "webchat",
 *       method: "post"
 *     }
 *   },
 *   headers: { "authorization": "Bearer token..." },
 *   body: '{"message":"Hello"}'
 * }
 *
 * // Returns:
 * {
 *   statusCode: 200,
 *   headers: { "Content-Type": "application/json" },
 *   body: '{"success":true,"result":{...}}'
 * }
 * ```
 */
export const handler = async (event) => {
    const requestEvent = parseHttpEvent(event);
    try {
        const { resource, action, method } = requestEvent.targetResource;
        // Look up resource in routing map
        const resourceHandlers = routingMap[resource];
        if (!resourceHandlers) {
            return failure(`Invalid resource '${resource}'`, HttpStatusCode.BadRequest);
        }
        // Look up method handler for the resource. Forced to be lower case
        const handlerIndex = `${method}:${action}`;
        const handlerFn = resourceHandlers[handlerIndex];
        if (!handlerFn) {
            return failure(`Cannot ${method} '${action}' on resource '${resource}'`, HttpStatusCode.BadRequest);
        }
        // Execute handler (with any middleware chain)
        const response = await handlerFn(requestEvent);
        // Return successful response
        return success(response.result || response);
    }
    catch (err) {
        const msg = getErrorMessage(err);
        const statusCode = err instanceof HttpCodedError ? err.statusCode : HttpStatusCode.InternalServerError;
        const { requestContext, pathParameters, queryStringParameters } = requestEvent.httpContext;
        logger.error(msg, err, {
            statusCode,
            requestContext,
            pathParameters,
            queryStringParameters
        });
        return failure(msg, statusCode, err);
    }
};
//# sourceMappingURL=http-router.js.map