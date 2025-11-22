import { HttpCodedError } from '../errors/http-error';
import { HttpStatusCode } from 'axios';
import { getErrorMessage } from '../utils/lib';
import { notifySlackAsync } from '../services/slack-notifier';
import logger from '../utils/logger';
export function setupErrorHandler() {
    return (err, req, res, next) => {
        const statusCode = err instanceof HttpCodedError ? err.statusCode : HttpStatusCode.InternalServerError;
        const message = getErrorMessage(err);
        const errorJson = {
            message,
            name: err instanceof Error ? err.name : 'Error',
            ...(err instanceof Error && { stack: err.stack })
        };
        if (err instanceof HttpCodedError && err.details) {
            errorJson.details = err.details;
        }
        if (err instanceof Error && 'code' in err) {
            errorJson.code = err.code;
        }
        const stacktrace = err instanceof Error ? err.stack || 'No stack trace available' : String(err);
        const clientInfo = {
            origin: req.get('Origin'),
            ip: req.ip || req.socket.remoteAddress || req.get('X-Forwarded-For') || 'Unknown',
            token: req.get('Authorization') ? maskToken(req.get('Authorization') || '') : undefined,
            userAgent: req.get('User-Agent'),
            requestId: req.get('X-Request-Id')
        };
        const errorData = {
            environment: process.env.STAGE || process.env.NODE_ENV || 'development',
            errorJson,
            stacktrace,
            endpoint: req.path,
            method: req.method,
            payload: req.body,
            timestamp: new Date().toISOString(),
            clientInfo
        };
        notifySlackAsync(errorData);
        logger.error(message, err, {
            statusCode,
            endpoint: req.path,
            method: req.method,
            clientInfo
        });
        res.status(statusCode).json({
            success: false,
            message,
            error: {
                message,
                code: err instanceof HttpCodedError && 'code' in err ? String(err.code) : undefined
            }
        });
    };
}
function maskToken(token) {
    if (token.startsWith('Bearer ')) {
        const actualToken = token.substring(7);
        if (actualToken.length > 10) {
            return `Bearer ${actualToken.substring(0, 10)}...`;
        }
        return 'Bearer ***';
    }
    if (token.length > 10) {
        return `${token.substring(0, 10)}...`;
    }
    return '***';
}
