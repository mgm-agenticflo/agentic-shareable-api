/**
 * Structured logging utility for AWS Lambda with CloudWatch integration.
 *
 * Provides JSON-formatted logs that are easily queryable in CloudWatch Insights.
 * Works both in serverless-offline and deployed environments.
 */
import { isTrue } from './lib';
/** Configured log level from environment (default: 'info') */
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
/** Current deployment stage (default: 'dev') */
const STAGE = process.env.STAGE || 'dev';
/**
 * Numeric log levels for filtering.
 * Lower numbers = higher priority (errors always log, debug rarely logs)
 */
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (LogLevel = {}));
/** Maps string log level names to numeric values */
const LEVEL_MAP = {
    error: LogLevel.ERROR,
    warn: LogLevel.WARN,
    info: LogLevel.INFO,
    debug: LogLevel.DEBUG
};
/** The current numeric log level threshold based on LOG_LEVEL environment variable */
const currentLevel = LEVEL_MAP[LOG_LEVEL] ?? LogLevel.INFO;
/**
 * Internal structured logging function with level filtering.
 *
 * Outputs logs in JSON format for CloudWatch (deployed) or pretty-printed
 * format for local development (offline). Automatically filters out logs
 * below the configured LOG_LEVEL threshold.
 *
 * @param level - Log level string ('error', 'warn', 'info', 'debug')
 * @param message - Primary log message
 * @param context - Optional additional context data to include in log entry
 */
function structuredLog(level, message, context) {
    const logLevel = LEVEL_MAP[level] ?? LogLevel.INFO;
    if (logLevel > currentLevel) {
        return; // Skip if below configured level
    }
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        message,
        ...context
    };
    // Pretty print in offline mode
    if (isTrue(process.env.IS_OFFLINE)) {
        console.log(`[${logEntry.level}] ${logEntry.message}`, context ? context : '');
    }
    else {
        console.log(JSON.stringify(logEntry));
    }
}
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
export const error = (message, error, context) => {
    const errorContext = {
        ...context,
        ...(error instanceof Error && {
            error: error.message,
            stack: error.stack
        })
    };
    structuredLog('error', message, errorContext);
};
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
export const warn = (message, context) => {
    structuredLog('warn', message, context);
};
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
export const info = (message, context) => {
    structuredLog('info', message, context);
};
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
export const debug = (message, context) => {
    if (STAGE === 'prod')
        return; // Never log debug in production
    structuredLog('debug', message, context);
};
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
const logger = {
    error,
    warn,
    info,
    debug
};
export default logger;
