import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Response } from 'express';
import { WebsocketResponse } from '../types/response-types';
import { HttpStatusCode } from 'axios';
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
export declare const success: (result?: unknown, statusCode?: HttpStatusCode) => APIGatewayProxyStructuredResultV2;
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
export declare const failure: (message: string, statusCode?: HttpStatusCode, error?: Error) => APIGatewayProxyStructuredResultV2;
export declare const wsSuccess: (result?: unknown, statusCode?: HttpStatusCode) => WebsocketResponse;
export declare const wsFailure: (message: string, statusCode?: HttpStatusCode, error?: Error) => WebsocketResponse;
/**
 * Express.js response helper for successful responses
 * Sends a JSON response with success: true and result data
 *
 * @param res - Express response object
 * @param result - The data to return in the response body
 * @param statusCode - HTTP status code (defaults to 200 OK)
 */
export declare const expressSuccess: (res: Response, result?: unknown, statusCode?: HttpStatusCode) => void;
/**
 * Express.js response helper for error responses
 * Sends a JSON response with success: false and error details
 *
 * @param res - Express response object
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code (defaults to 500 Internal Server Error)
 * @param error - Optional error object for additional details
 */
export declare const expressFailure: (res: Response, message: string, statusCode?: HttpStatusCode, error?: Error) => void;
//# sourceMappingURL=response.d.ts.map