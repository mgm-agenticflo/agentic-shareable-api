import { HttpCodedError } from '../errors/http-error';
import { tokenService } from '../services/transient-token';
import { getHeader } from '../utils/lib';
import { HttpStatusCode } from 'axios';
export const jwtMiddleware = async (event, next) => {
    try {
        const headers = event.httpContext?.headers;
        if (!headers) {
            throw new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
        }
        const authHeader = getHeader(headers, 'Authorization');
        if (!authHeader) {
            throw new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
        }
        const match = /^Bearer\s+(.+)$/i.exec(authHeader);
        if (!match)
            throw new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization format');
        const token = match[1].trim();
        if (!token) {
            throw new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
        }
        const shareableContext = tokenService.verify(token);
        if (!shareableContext) {
            throw new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
        }
        const enhancedEvent = {
            ...event,
            shareableContext
        };
        return next(enhancedEvent);
    }
    catch (err) {
        if (err instanceof HttpCodedError) {
            throw err;
        }
        throw new HttpCodedError(HttpStatusCode.UnprocessableEntity, 'Can not evaluate authorization');
    }
};
export const jwtExpressMiddleware = (req, res, next) => {
    const headers = req.headers;
    const authHeader = getHeader(headers, 'Authorization');
    if (!authHeader) {
        return next(new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization'));
    }
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    if (!match) {
        return next(new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization format'));
    }
    const token = match[1].trim();
    if (!token) {
        return next(new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization'));
    }
    const shareableContext = tokenService.verify(token);
    if (!shareableContext) {
        return next(new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization'));
    }
    req.shareableContext = shareableContext;
    next();
};
