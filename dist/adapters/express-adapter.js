import { safeJson } from '../utils/lib';
/**
 * Converts an Express request/response to a RequestEvent format
 * that is compatible with existing handlers.
 *
 * This adapter allows us to reuse all existing handlers without modification
 * by converting Express's req/res format to the RequestEvent format used
 * by the Lambda handlers.
 *
 * @param req - Express request object
 * @returns RequestEvent compatible with existing handlers
 */
export function expressToRequestEvent(req) {
    const method = req.method.toUpperCase();
    // Use originalUrl to get the full path including query string, then extract just the path
    const fullPath = req.originalUrl || req.url;
    const path = fullPath.split('?')[0]; // Remove query string
    // Strip base path if configured
    const basePath = process.env.HTTP_BASE_PATH || '';
    const normalizedPath = basePath && path.startsWith(basePath) ? path.slice(basePath.length) : path;
    const pathParts = normalizedPath?.split('/').filter(Boolean) ?? [];
    const resource = pathParts[0] ?? undefined;
    const action = pathParts[1] ?? undefined;
    // Convert Express headers to the format expected by RequestEvent
    const headers = {};
    Object.keys(req.headers).forEach((key) => {
        const value = req.headers[key];
        if (value) {
            headers[key] = Array.isArray(value) ? value[0] : value;
        }
    });
    // Parse body - Express already parses JSON, but we need to handle it safely
    let parsedBody = {};
    if (req.body) {
        parsedBody = req.body;
    }
    else if (typeof req.body === 'string') {
        parsedBody = safeJson(req.body);
    }
    // Create a mock API Gateway event structure for compatibility
    // This allows handlers that check httpContext to still work
    const mockEvent = {
        requestContext: {
            http: {
                method,
                path: normalizedPath,
                protocol: req.protocol,
                sourceIp: req.ip || req.socket.remoteAddress || '',
                userAgent: req.get('user-agent') || ''
            }
        },
        headers,
        body: typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody),
        isBase64Encoded: false,
        rawPath: normalizedPath,
        rawQueryString: req.url.split('?')[1] || '',
        queryStringParameters: req.query,
        pathParameters: req.params
    };
    return {
        httpContext: mockEvent,
        parsedBody,
        targetResource: {
            method,
            resource,
            action
        }
    };
}
//# sourceMappingURL=express-adapter.js.map