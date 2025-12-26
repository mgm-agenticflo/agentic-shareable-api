import { HttpStatusCode } from 'axios';
import { getErrorMessage } from './lib';
/**
 * Creates a successful API Gateway response with standardized JSON structure.
 *
 * Returns a response with `success: true` and the provided result data in the body.
 * Always includes Content-Type header set to application/json.
 *
 * @param result - The data to return in the response body (will be JSON stringified)
 * @param statusCode - HTTP status code (defaults to 200 OK)
 * @returns API Gateway structured response with success flag and result data
 *
 * @example
 * ```typescript
 * return success({ userId: 123, name: 'Alice' });
 * // => {
 * //   statusCode: 200,
 * //   body: '{"success":true,"result":{"userId":123,"name":"Alice"}}',
 * //   headers: { 'Content-Type': 'application/json' }
 * // }
 * ```
 *
 * @example
 * ```typescript
 * return success({ items: [] }, HttpStatusCode.Created);
 * // => { statusCode: 201, body: '{"success":true,"result":{"items":[]}}', ... }
 * ```
 */
export const success = (result, statusCode = HttpStatusCode.Ok) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, result: result || 'Ok' })
});
/**
 * Creates an error API Gateway response with standardized JSON structure.
 *
 * Returns a response with `success: false` and error details in the body.
 * The error parameter is parsed to extract message and code information.
 * Always includes Content-Type header set to application/json.
 *
 * @param message - Human-readable error message to display to the client
 * @param statusCode - HTTP status code (defaults to 500 Internal Server Error)
 * @param error - Optional error object or data to be parsed for additional details
 * @returns API Gateway structured response with success flag and error details
 *
 * @example
 * ```typescript
 * return failure('User not found', HttpStatusCode.NotFound);
 * // => {
 * //   statusCode: 404,
 * //   body: '{"success":false,"message":"User not found","error":{"message":"An error occurred"}}',
 * //   headers: { 'Content-Type': 'application/json' }
 * // }
 * ```
 *
 * @example
 * ```typescript
 * const err = new Error('Database connection failed');
 * return failure('Cannot retrieve data', HttpStatusCode.ServiceUnavailable, err);
 * // => {
 * //   statusCode: 503,
 * //   body: '{"success":false,"message":"Cannot retrieve data","error":{...}}',
 * //   headers: { 'Content-Type': 'application/json' }
 * // }
 * ```
 */
export const failure = (message, statusCode = HttpStatusCode.InternalServerError, error) => {
    const response = {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            success: false,
            message,
            error: parseError(error)
        })
    };
    return response;
};
/**
 * Parses and normalizes error data into a consistent PublicError format.
 *
 * Handles various error input formats and extracts message and code properties:
 * - Direct string: `"Something went wrong"` → `{ message: "Something went wrong" }`
 * - Object with error property: `{ error: "text" }` → extracts the error value
 * - Error object with message: `{ message: "...", code: "..." }` → extracts both
 * - Any other format: `{ message: "An error occurred" }` (fallback)
 *
 * @param result - The error data to parse (can be string, Error object, or any structure)
 * @returns Normalized PublicError object with message and optional code
 *
 * @example
 * ```typescript
 * parseError('Invalid input');
 * // => { message: 'Invalid input', code: undefined }
 * ```
 *
 * @example
 * ```typescript
 * parseError({ error: { message: 'Invalid token', code: 'AUTH_FAILED' } });
 * // => { message: 'Invalid token', code: 'AUTH_FAILED' }
 * ```
 *
 * @example
 * ```typescript
 * parseError(new Error('Database error'));
 * // => { message: 'Database error', code: undefined }
 * ```
 *
 * @internal
 */
function parseError(error) {
    if (!error) {
        return {
            message: 'Error',
            code: 'UNKNOWN'
        };
    }
    // Extract message from various formats
    const message = getErrorMessage(error);
    // Extract optional error code
    const code = 'code' in error ? String(error.code) : undefined;
    return { message, code };
}
export const wsSuccess = (result, statusCode = HttpStatusCode.Ok) => ({
    statusCode,
    success: true,
    message: 'Ok',
    result
});
export const wsFailure = (message, statusCode = HttpStatusCode.InternalServerError, error) => {
    return {
        statusCode,
        success: false,
        message,
        error: parseError(error)
    };
};
/**
 * Express.js response helper for successful responses
 * Sends a JSON response with success: true and result data
 *
 * @param res - Express response object
 * @param result - The data to return in the response body
 * @param statusCode - HTTP status code (defaults to 200 OK)
 */
export const expressSuccess = (res, result, statusCode = HttpStatusCode.Ok) => {
    res.status(statusCode).json({
        success: true,
        result: result || 'Ok'
    });
};
/**
 * Express.js response helper for error responses
 * Sends a JSON response with success: false and error details
 *
 * @param res - Express response object
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code (defaults to 500 Internal Server Error)
 * @param error - Optional error object for additional details
 */
export const expressFailure = (res, message, statusCode = HttpStatusCode.InternalServerError, error) => {
    res.status(statusCode).json({
        success: false,
        message,
        error: parseError(error)
    });
};
//# sourceMappingURL=response.js.map