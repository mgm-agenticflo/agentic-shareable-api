import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
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
export declare const handler: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyStructuredResultV2>;
//# sourceMappingURL=http-router.d.ts.map