/**
 * Structured logging utility for AWS Lambda with CloudWatch integration.
 *
 * Provides JSON-formatted logs that are easily queryable in CloudWatch Insights.
 * Works both in serverless-offline and deployed environments.
 */
/**
 * Logs an error message with optional error object and context.
 *
 * Always logged regardless of LOG_LEVEL configuration. If an Error object
 * is provided, automatically extracts and includes the error message and
 * stack trace in the log output.
 *
 * @param message - Human-readable error description
 * @param error - Optional Error object or other error value
 * @param context - Optional additional context data
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   logger.error('Operation failed', err, { userId: '123' });
 * }
 * ```
 */
export declare const error: (message: string, error?: unknown, context?: Record<string, unknown>) => void;
/**
 * Logs a warning message with optional context.
 *
 * Used for potentially problematic situations that don't prevent execution
 * but may need attention (e.g., deprecation warnings, rate limit warnings).
 *
 * @param message - Warning message
 * @param context - Optional additional context data
 *
 * @example
 * ```typescript
 * logger.warn('Rate limit approaching', { current: 95, limit: 100 });
 * ```
 */
export declare const warn: (message: string, context?: Record<string, unknown>) => void;
/**
 * Logs an informational message with optional context.
 *
 * Used for general operational messages and important state changes
 * (e.g., request processing, successful operations, configuration info).
 *
 * @param message - Informational message
 * @param context - Optional additional context data
 *
 * @example
 * ```typescript
 * logger.info('User authenticated', { userId: '123', method: 'jwt' });
 * ```
 */
export declare const info: (message: string, context?: Record<string, unknown>) => void;
/**
 * Logs a debug message with optional context.
 *
 * Used for detailed diagnostic information useful during development.
 * **Never logs in production** to reduce noise and CloudWatch costs.
 * Only logs when LOG_LEVEL is set to 'debug' in non-production environments.
 *
 * @param message - Debug message
 * @param context - Optional additional context data
 *
 * @example
 * ```typescript
 * logger.debug('Processing event', { eventType: 'MESSAGE', payload: data });
 * ```
 */
export declare const debug: (message: string, context?: Record<string, unknown>) => void;
/**
 * Default logger instance with all logging methods.
 *
 * Provides a convenient object-based interface for importing the logger.
 *
 * @example
 * ```typescript
 * import logger from './logger';
 * logger.info('Application started');
 * ```
 */
declare const logger: {
    error: (message: string, error?: unknown, context?: Record<string, unknown>) => void;
    warn: (message: string, context?: Record<string, unknown>) => void;
    info: (message: string, context?: Record<string, unknown>) => void;
    debug: (message: string, context?: Record<string, unknown>) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map