import { Request, Response, NextFunction } from 'express';
import { HttpCodedError } from '../errors/http-error';
import { tokenService } from '../services/transient-token';
import { HttpStatusCode } from 'axios';

/**
 * Express middleware that validates JWT tokens from the Authorization header.
 *
 * This middleware:
 * 1. Extracts the JWT token from the Authorization header (must be in Bearer token format)
 * 2. Verifies the token using the token service
 * 3. Adds the decoded ShareableContext to the request object (req.shareableContext)
 * 4. Calls next() to continue to the next middleware/handler
 *
 * The Authorization header must follow the format: `Bearer <token>`
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 * @throws {HttpCodedError} 401 Unauthorized - If Authorization header is missing or invalid
 * @throws {HttpCodedError} 401 Unauthorized - If Authorization format is not "Bearer <token>"
 * @throws {HttpCodedError} 422 Unprocessable Entity - If token verification fails
 *
 * @example
 * ```typescript
 * // Apply middleware to a route
 * app.post('/protected', jwtGuard, handler);
 *
 * // In handler, access the shareable context
 * const handler = (req: Request, res: Response) => {
 *   const context = req.shareableContext;
 *   console.log('Shareable Token:', context.token);
 * };
 * ```
 */
export const jwtGuard = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
    }

    // Must be Bearer token format
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    if (!match) {
      throw new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization format');
    }

    const token = match[1].trim();
    if (!token) {
      throw new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
    }

    const shareableContext = tokenService.verify(token);
    if (!shareableContext) {
      throw new HttpCodedError(HttpStatusCode.Unauthorized, 'Invalid Authorization');
    }

    // Add shareable context to request for downstream handlers
    req.shareableContext = shareableContext;

    next();
  } catch (err) {
    // Re-throw HttpCodedErrors as-is
    if (err instanceof HttpCodedError) {
      res.status(err.statusCode).json({
        success: false,
        message: err.message,
        error: { message: err.message, code: err.statusCode.toString() }
      });
      return;
    }
    // Otherwise return generic error
    res.status(HttpStatusCode.UnprocessableEntity).json({
      success: false,
      message: 'Can not evaluate authorization',
      error: { message: 'Can not evaluate authorization', code: 'AUTH_ERROR' }
    });
  }
};

// Extend Express Request type to include shareableContext
declare module 'express-serve-static-core' {
  interface Request {
    shareableContext?: import('../types/shareable-context').ShareableContext;
  }
}
